import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/use-auth";
import Navigation from "../components/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
const QT = {
  mcq:      { label: "Multiple Choice", short: "MCQ",      icon: "🎯", accent: "#818cf8" },
  short:    { label: "Short Answer",    short: "2 Mark",   icon: "✏️",  accent: "#38bdf8" },
  medium:   { label: "Medium Answer",   short: "5 Mark",   icon: "📝",  accent: "#fb923c" },
  long:     { label: "Long Answer",     short: "Essay",    icon: "📄",  accent: "#f472b6" },
  speech:   { label: "Voice Answer",    short: "Speech",   icon: "🎤",  accent: "#34d399" },
  image:    { label: "Image Upload",    short: "Image",    icon: "🖼️",  accent: "#a78bfa" },
  document: { label: "Doc Upload",      short: "Document", icon: "📎",  accent: "#60a5fa" },
};

const SUBJECT_META = {
  "Biology":          { color: "#10b981", bg: "rgba(16,185,129,.12)"  },
  "Physics":          { color: "#f59e0b", bg: "rgba(245,158,11,.12)"  },
  "Computer Science": { color: "#6366f1", bg: "rgba(99,102,241,.12)"  },
  "Mathematics":      { color: "#ec4899", bg: "rgba(236,72,153,.12)"  },
  "Chemistry":        { color: "#0ea5e9", bg: "rgba(14,165,233,.12)"  },
  "History":          { color: "#8b5cf6", bg: "rgba(139,92,246,.12)"  },
};

const MOCK = [
  {
    id:"hw-001", subject:"Biology", topic:"Cell Discovery & Organelles", grade:"Grade 10",
    totalMarks:30, timeLimit:45, aiGenerated:true, triggeredBy:"auto",
    dueDate:"Mar 22", status:"pending", emoji:"🔬", color:["#6366f1","#8b5cf6"],
    description:"Explore the fundamental building blocks of life — cell theory, organelle functions, and microscopy techniques.",
    questions:[
      {id:"q1",type:"mcq",marks:1,question:"Who coined the term 'cell' after observing cork under a microscope?",options:["Anton van Leeuwenhoek","Robert Hooke","Matthias Schleiden","Theodor Schwann"],correctOption:1,hint:"He described cell walls of dead plant tissue in 1665."},
      {id:"q2",type:"mcq",marks:1,question:"Which organelle is known as the 'powerhouse of the cell'?",options:["Nucleus","Ribosome","Mitochondria","Golgi apparatus"],correctOption:2},
      {id:"q3",type:"mcq",marks:1,question:"What does the Unified Cell Theory state about all living organisms?",options:["Composed of atoms only","Composed of one or more cells","Reproduce asexually","Require oxygen"],correctOption:1},
      {id:"q4",type:"short",marks:2,question:"Define cellular respiration and name the organelle where it primarily occurs.",minWords:20,maxWords:60,hint:"Think about where ATP production takes place."},
      {id:"q5",type:"short",marks:2,question:"Distinguish between prokaryotic and eukaryotic cells with one example each.",minWords:25,maxWords:70},
      {id:"q6",type:"medium",marks:5,question:"Describe the structure and function of the mitochondria. Why is it central to cellular life?",minWords:80,maxWords:150},
      {id:"q7",type:"image",marks:3,question:"Upload a labeled diagram of an animal cell showing at least 5 organelles.",hint:"Draw, photograph or scan your diagram and upload here."},
      {id:"q8",type:"speech",marks:5,question:"Explain the significance of the microscope in developing cell theory. Speak for at least 30 seconds.",hint:"Talk about Hooke, Leeuwenhoek, and how their observations led to cell theory."},
      {id:"q9",type:"long",marks:10,question:"Write a detailed essay on the Three Pillars of Cell Theory — historical context, each pillar, and a modern medical application.",minWords:200,maxWords:400,hint:"Structure: Introduction → Pillar 1 → Pillar 2 → Pillar 3 → Application → Conclusion."},
    ],
  },
  {
    id:"hw-002", subject:"Physics", topic:"Newtonian Laws of Motion", grade:"Grade 11",
    totalMarks:25, timeLimit:40, aiGenerated:true, triggeredBy:"auto",
    dueDate:"Mar 23", status:"in-progress", emoji:"⚡", color:["#f59e0b","#ef4444"],
    description:"Master Newton's three fundamental laws and their real-world applications in classical mechanics.",
    questions:[
      {id:"q1",type:"mcq",marks:1,question:"Newton's First Law is also known as the Law of:",options:["Gravitation","Inertia","Acceleration","Action-Reaction"],correctOption:1},
      {id:"q2",type:"mcq",marks:1,question:"If F = 20 N and m = 4 kg, what is the acceleration?",options:["2 m/s²","4 m/s²","5 m/s²","80 m/s²"],correctOption:2},
      {id:"q3",type:"short",marks:2,question:"State Newton's Third Law and give one everyday example.",minWords:20,maxWords:60},
      {id:"q4",type:"document",marks:3,question:"Upload your solved force diagram worksheet for the pulley system problem.",hint:"Scan or photograph your handwritten work."},
      {id:"q5",type:"medium",marks:5,question:"A car of 1000 kg accelerates from 0 to 20 m/s in 5 s. Calculate net force and explain which Newton's Law applies.",minWords:60,maxWords:120},
      {id:"q6",type:"speech",marks:5,question:"Describe how Newton's Three Laws apply to a rocket launch. Speak for at least 45 seconds."},
      {id:"q7",type:"long",marks:8,question:"Analyse the impact of Newton's Laws on classical mechanics and modern engineering with examples.",minWords:180,maxWords:350},
    ],
  },
  {
    id:"hw-003", subject:"Computer Science", topic:"Algorithms & Data Structures", grade:"Grade 12",
    totalMarks:20, timeLimit:35, aiGenerated:true, triggeredBy:"teacher",
    dueDate:"Mar 24", status:"submitted", score:17, emoji:"💻", color:["#10b981","#0ea5e9"],
    description:"Deep dive into fundamental algorithms and data structures — time complexity, sorting, and real-world applications.",
    questions:[
      {id:"q1",type:"mcq",marks:1,question:"What is the time complexity of Binary Search?",options:["O(n)","O(log n)","O(n²)","O(1)"],correctOption:1},
      {id:"q2",type:"short",marks:2,question:"Explain the difference between a Stack and a Queue.",minWords:20,maxWords:60},
      {id:"q3",type:"image",marks:3,question:"Draw and upload a diagram showing Merge Sort steps on [5,2,8,1,9,3].",hint:"Show each split and merge step clearly."},
      {id:"q4",type:"medium",marks:5,question:"Explain the Divide and Conquer paradigm using Merge Sort as an example.",minWords:80,maxWords:150},
      {id:"q5",type:"long",marks:9,question:"Compare linear and non-linear data structures — applications, advantages, limitations, and code examples.",minWords:160,maxWords:300},
    ],
  },
  {
    id:"hw-004", subject:"Mathematics", topic:"Calculus — Differentiation", grade:"Grade 12",
    totalMarks:35, timeLimit:60, aiGenerated:false, triggeredBy:"teacher",
    dueDate:"Mar 25", status:"pending", emoji:"📐", color:["#ec4899","#8b5cf6"],
    description:"Practice differentiation rules — chain rule, product rule, quotient rule — with real-world application problems.",
    questions:[
      {id:"q1",type:"mcq",marks:1,question:"What is the derivative of sin(x)?",options:["cos(x)","-cos(x)","sin(x)","-sin(x)"],correctOption:0},
      {id:"q2",type:"mcq",marks:1,question:"The chain rule is used when differentiating:",options:["Sum of functions","Product of constants","Composite functions","Simple polynomials"],correctOption:2},
      {id:"q3",type:"short",marks:2,question:"State the Power Rule and differentiate f(x) = 4x³ + 2x² - 7x + 3.",minWords:20,maxWords:70},
      {id:"q4",type:"document",marks:4,question:"Upload your completed differentiation worksheet with all working shown.",hint:"Neatly hand-written or typed. Show all steps."},
      {id:"q5",type:"medium",marks:7,question:"Using the Product Rule, differentiate f(x) = (3x² + 1)(sin x). Show all steps.",minWords:80,maxWords:140},
      {id:"q6",type:"image",marks:4,question:"Upload a photo of your hand-drawn graph of f(x) = x³ - 3x with critical points marked.",hint:"Label maxima, minima, and inflection points."},
      {id:"q7",type:"long",marks:16,question:"Explain differentiation in economics: marginal cost, revenue and profit. Solve a worked example for C(x) = 0.01x³ - 0.5x² + 20x + 300.",minWords:200,maxWords:450},
    ],
  },
  {
    id:"hw-005", subject:"History", topic:"World War II — Key Battles", grade:"Grade 11",
    totalMarks:20, timeLimit:30, aiGenerated:false, triggeredBy:"teacher",
    dueDate:"Mar 26", status:"graded", score:18, emoji:"🌍", color:["#8b5cf6","#6366f1"],
    description:"Analyse the turning points of World War II, focusing on key battles and their strategic significance.",
    questions:[
      {id:"q1",type:"mcq",marks:1,question:"Which battle is considered the turning point of WWII on the Eastern Front?",options:["Battle of Britain","Battle of Stalingrad","D-Day Normandy","Battle of Midway"],correctOption:1},
      {id:"q2",type:"short",marks:2,question:"Why was Operation Overlord (D-Day) strategically significant?",minWords:25,maxWords:70},
      {id:"q3",type:"medium",marks:5,question:"Compare the Battle of Britain and the Battle of Stalingrad in terms of strategy, outcome, and importance.",minWords:80,maxWords:150},
      {id:"q4",type:"long",marks:12,question:"Evaluate the role of air power in determining the outcomes of key WWII battles. Use at least three examples.",minWords:200,maxWords:380},
    ],
  },
];

// ─── AI Chat Responses ────────────────────────────────────────────────────────
const AI_RESPONSES = {
  default: [
    "Great question! I'm here to help guide you — but remember, I'll give you hints rather than direct answers to help you learn better. 📚",
    "That's a thoughtful question! Let me break it down for you step by step. Feel free to ask follow-up questions!",
    "I can definitely help with that! Here's a hint to point you in the right direction without giving away the answer...",
  ],
  biology: [
    "For cell biology questions, think about the relationship between structure and function. Each organelle has a specific role — like how mitochondria convert glucose to ATP energy! 🔬",
    "Remember the key principle: all living things are made of cells. When thinking about cell theory, consider the three main pillars proposed by Schleiden, Schwann, and Virchow.",
    "Great biology question! Consider how the cell membrane controls what enters and exits. Think of it like a security guard for the cell. 🧬",
  ],
  physics: [
    "For Newton's Laws, always start by identifying all forces acting on the object. Draw a free body diagram first! F = ma is your best friend here. ⚡",
    "Physics tip: Units are crucial! Always check if your answer has the right units. For force problems, you want Newtons (kg⋅m/s²).",
    "Remember: Newton's Third Law says forces come in pairs. For every action, there's an equal and opposite reaction — like a rocket expelling gas downward to go upward! 🚀",
  ],
  math: [
    "For calculus, always remember the basic differentiation rules: power rule, chain rule, product rule. Practice them separately before combining! 📐",
    "Hint for differentiation: The power rule says d/dx[xⁿ] = nxⁿ⁻¹. Apply this to each term separately for polynomial functions!",
    "When using the chain rule, identify the 'outer' and 'inner' functions first. Differentiate outer, multiply by derivative of inner. 🧮",
  ],
  history: [
    "For historical analysis, always consider: Who? What? When? Where? Why? And most importantly — What were the consequences? 🌍",
    "Strong history essays connect causes to effects. The Battle of Stalingrad wasn't just a military defeat for Germany — it shifted the entire momentum of the war!",
    "Remember to use specific dates, names, and places in your answers. Vague answers lose marks — precise historical evidence shows deep understanding. 📜",
  ],
  cs: [
    "For algorithm questions, always think about time and space complexity. Binary Search is O(log n) because it halves the search space each time! 💻",
    "Data structures tip: Think about what operations you need most. Arrays are fast for random access, linked lists for insertion/deletion, trees for hierarchical data!",
    "When explaining algorithms, trace through a small example step-by-step. This shows the examiner you truly understand the process, not just memorized it. 🖥️",
  ],
};

const QUICK_PROMPTS = [
  "💡 Give me a hint",
  "📖 Explain the topic",
  "✅ Check my approach",
  "🔍 Key concepts",
  "📝 Essay structure help",
  "⚠️ Common mistakes",
];

function getAIResponse(message, currentSubject) {
  const msg = message.toLowerCase();
  let pool = AI_RESPONSES.default;
  
  if (currentSubject === "Biology" || msg.includes("cell") || msg.includes("bio")) pool = AI_RESPONSES.biology;
  else if (currentSubject === "Physics" || msg.includes("force") || msg.includes("newton") || msg.includes("physics")) pool = AI_RESPONSES.physics;
  else if (currentSubject === "Mathematics" || msg.includes("calculus") || msg.includes("derivative") || msg.includes("math")) pool = AI_RESPONSES.math;
  else if (currentSubject === "History" || msg.includes("war") || msg.includes("battle") || msg.includes("history")) pool = AI_RESPONSES.history;
  else if (currentSubject === "Computer Science" || msg.includes("algorithm") || msg.includes("code") || msg.includes("sort")) pool = AI_RESPONSES.cs;

  // Context-specific responses
  if (msg.includes("hint")) return "Here's a hint without giving it away: Focus on the key terms in the question. Underline the action words — they tell you exactly what the examiner wants. 💡";
  if (msg.includes("essay") || msg.includes("structure")) return "Great essay structure: 1) Introduction with thesis statement 2) Body paragraphs (1 idea each) 3) Evidence & examples 4) Conclusion that restates thesis. Aim for each paragraph to begin with a topic sentence! 📝";
  if (msg.includes("mistake") || msg.includes("wrong")) return "Common mistakes to avoid: ❌ Not answering the exact question asked ❌ Using vague language instead of specific terms ❌ Forgetting units in science ❌ Not using evidence in humanities. Always re-read the question after writing! ⚠️";
  if (msg.includes("concept") || msg.includes("key")) return "Key concepts are the foundation! Start by identifying the main topic keywords, then recall definitions, then think about how concepts connect to each other. Mind maps can really help here! 🔗";
  if (msg.includes("check") || msg.includes("approach")) return "Your approach sounds good! Make sure you: ✅ Directly answer what's asked ✅ Use subject-specific vocabulary ✅ Back up claims with evidence ✅ Stay within the word count guidelines. You're on the right track! 🎯";
  
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Ring SVG ─────────────────────────────────────────────────────────────────
const Ring = ({ pct=0, size=54, stroke=5, color="#6366f1", bg="rgba(255,255,255,.18)", children }) => {
  const r = (size - stroke * 2) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)", display:"block" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${(pct/100)*c} ${c}`} strokeLinecap="round"
          style={{ transition:"stroke-dasharray .8s cubic-bezier(.4,0,.2,1)" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>{children}</div>
    </div>
  );
};

// ─── Animated Number ──────────────────────────────────────────────────────────
function AnimNum({ target, suffix="" }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let cur = 0;
    const step = () => { cur += target/48; if(cur < target){ setV(Math.floor(cur)); requestAnimationFrame(step); } else setV(target); };
    requestAnimationFrame(step);
  }, [target]);
  return <>{v}{suffix}</>;
}

// ─── AI Chat Widget ───────────────────────────────────────────────────────────
function AIChatWidget({ currentSubject, currentQuestion, dark }) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, from: "ai", text: "Hey there! 👋 I'm your AI Study Assistant. I'm here to help you understand concepts, give hints, and guide you through your homework — without giving away the answers! What would you like help with?", time: new Date() }
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const [shake, setShake] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 300); }
  }, [open]);

  useEffect(() => {
    if (open && !minimized) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, minimized]);

  // Pulse the button periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (!open) { setShake(true); setTimeout(() => setShake(false), 600); }
    }, 8000);
    return () => clearInterval(interval);
  }, [open]);

  const sendMessage = useCallback(async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    const userMsg = { id: Date.now(), from: "user", text: msg, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setTyping(true);

    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
    const aiText = getAIResponse(msg, currentSubject);
    setMessages(prev => [...prev, { id: Date.now()+1, from: "ai", text: aiText, time: new Date() }]);
    setTyping(false);
    if (!open) setUnread(u => u + 1);
  }, [input, currentSubject, open]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const fmtTime = (d) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <style>{`
        @keyframes floatBtn {
          0%,100%{transform:translateY(0) scale(1)}
          50%{transform:translateY(-6px) scale(1.04)}
        }
        @keyframes shakeBtn {
          0%,100%{transform:rotate(0deg)}
          20%{transform:rotate(-8deg) scale(1.05)}
          40%{transform:rotate(8deg) scale(1.05)}
          60%{transform:rotate(-5deg) scale(1.02)}
          80%{transform:rotate(5deg) scale(1.02)}
        }
        @keyframes slideInChat {
          from{opacity:0;transform:translateY(20px) scale(.95)}
          to{opacity:1;transform:translateY(0) scale(1)}
        }
        @keyframes slideOutChat {
          from{opacity:1;transform:translateY(0) scale(1)}
          to{opacity:0;transform:translateY(20px) scale(.95)}
        }
        @keyframes typingDot {
          0%,80%,100%{transform:scale(0.6);opacity:.4}
          40%{transform:scale(1);opacity:1}
        }
        @keyframes msgIn {
          from{opacity:0;transform:translateY(8px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes ripple {
          0%{transform:scale(1);opacity:.7}
          100%{transform:scale(2.2);opacity:0}
        }
        @keyframes badgePop {
          0%{transform:scale(0)}
          60%{transform:scale(1.2)}
          100%{transform:scale(1)}
        }

        .ai-fab-wrap {
          position:fixed;
          bottom:28px;
          right:28px;
          z-index:9999;
          display:flex;
          flex-direction:column;
          align-items:flex-end;
          gap:12px;
        }

        .ai-fab {
          width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;
          background:linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899);
          color:#fff;font-size:26px;display:flex;align-items:center;justify-content:center;
          box-shadow:0 8px 32px rgba(99,102,241,.5),0 2px 8px rgba(0,0,0,.2);
          position:relative;overflow:visible;
          transition:box-shadow .3s;
          animation:floatBtn 3s ease-in-out infinite;
        }
        .ai-fab.shake { animation:shakeBtn .6s ease both; }
        .ai-fab:hover {
          box-shadow:0 12px 40px rgba(99,102,241,.65),0 4px 12px rgba(0,0,0,.25);
        }
        .ai-fab-ripple {
          position:absolute;inset:-4px;border-radius:50%;
          border:2px solid rgba(99,102,241,.5);
          animation:ripple 2s ease-out infinite;
        }
        .ai-fab-ripple2 {
          position:absolute;inset:-4px;border-radius:50%;
          border:2px solid rgba(139,92,246,.4);
          animation:ripple 2s ease-out .5s infinite;
        }
        .ai-fab-badge {
          position:absolute;top:-6px;right:-6px;
          min-width:22px;height:22px;border-radius:11px;
          background:linear-gradient(135deg,#ef4444,#f97316);
          color:#fff;font-size:11px;font-weight:800;
          display:flex;align-items:center;justify-content:center;
          border:2.5px solid ${dark ? "#151c2e" : "#fff"};
          padding:0 5px;
          animation:badgePop .3s cubic-bezier(.34,1.56,.64,1) both;
        }
        .ai-fab-label {
          background:linear-gradient(135deg,#6366f1,#8b5cf6);
          color:#fff;font-family:'Plus Jakarta Sans',system-ui,sans-serif;
          font-size:12px;font-weight:700;padding:6px 14px;border-radius:20px;
          box-shadow:0 4px 16px rgba(99,102,241,.35);
          white-space:nowrap;
          animation:floatBtn 3s ease-in-out infinite;
          animation-delay:.3s;
        }

        .ai-chat-panel {
          position:fixed;
          bottom:104px;
          right:28px;
          width:min(400px, calc(100vw - 32px));
          height:min(580px, calc(100vh - 140px));
          background:${dark ? "#151c2e" : "#fff"};
          border-radius:24px;
          box-shadow:0 24px 64px rgba(0,0,0,${dark?".6":".18"}),0 4px 16px rgba(99,102,241,.15);
          border:1px solid ${dark ? "rgba(255,255,255,.08)" : "rgba(99,102,241,.12)"};
          display:flex;flex-direction:column;overflow:hidden;
          z-index:9998;
          animation:slideInChat .3s cubic-bezier(.34,1.56,.64,1) both;
        }
        .ai-chat-panel.closing {
          animation:slideOutChat .2s ease both;
        }
        .ai-chat-panel.minimized {
          height:64px;
          overflow:hidden;
        }

        .ai-chat-header {
          padding:16px 18px;
          background:linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899);
          display:flex;align-items:center;gap:12px;flex-shrink:0;
          position:relative;overflow:hidden;
        }
        .ai-chat-header::before {
          content:'';position:absolute;top:-30px;right:-30px;
          width:100px;height:100px;border-radius:50%;
          background:rgba(255,255,255,.08);pointer-events:none;
        }
        .ai-chat-avatar {
          width:40px;height:40px;border-radius:50%;
          background:rgba(255,255,255,.25);border:2px solid rgba(255,255,255,.4);
          display:flex;align-items:center;justify-content:center;
          font-size:20px;flex-shrink:0;position:relative;z-index:1;
        }
        .ai-online-dot {
          position:absolute;bottom:0;right:0;width:11px;height:11px;
          border-radius:50%;background:#34d399;border:2px solid #8b5cf6;
        }
        .ai-chat-hinfo { flex:1;min-width:0;position:relative;z-index:1; }
        .ai-chat-hname { font-size:14px;font-weight:800;color:#fff; }
        .ai-chat-hstatus { font-size:11px;color:rgba(255,255,255,.75);font-weight:600;display:flex;align-items:center;gap:4px; }
        .ai-chat-hbtns { display:flex;gap:6px;position:relative;z-index:1; }
        .ai-chat-hbtn {
          width:30px;height:30px;border-radius:8px;border:1.5px solid rgba(255,255,255,.3);
          background:rgba(255,255,255,.15);color:#fff;cursor:pointer;
          display:flex;align-items:center;justify-content:center;font-size:14px;
          backdrop-filter:blur(8px);transition:all .18s;
        }
        .ai-chat-hbtn:hover { background:rgba(255,255,255,.3);transform:scale(1.08); }

        .ai-subject-bar {
          padding:10px 14px;border-bottom:1px solid ${dark?"rgba(255,255,255,.07)":"rgba(99,102,241,.08)"};
          display:flex;align-items:center;gap:8px;flex-shrink:0;
          background:${dark?"rgba(99,102,241,.06)":"rgba(99,102,241,.03)"};
        }
        .ai-subject-tag {
          font-family:'Plus Jakarta Sans',system-ui,sans-serif;
          font-size:11px;font-weight:700;padding:4px 10px;border-radius:8px;white-space:nowrap;
        }

        .ai-messages {
          flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;
          scrollbar-width:thin;scrollbar-color:${dark?"rgba(255,255,255,.1)":"rgba(99,102,241,.15)"} transparent;
        }
        .ai-messages::-webkit-scrollbar{width:4px;}
        .ai-messages::-webkit-scrollbar-thumb{background:${dark?"rgba(255,255,255,.1)":"rgba(99,102,241,.15)"};border-radius:4px;}

        .ai-msg { display:flex;gap:8px;animation:msgIn .28s ease both; }
        .ai-msg.user { flex-direction:row-reverse; }
        .ai-msg-avatar {
          width:30px;height:30px;border-radius:50%;flex-shrink:0;
          display:flex;align-items:center;justify-content:center;
          font-size:14px;margin-top:2px;
        }
        .ai-msg-avatar.ai-av { background:linear-gradient(135deg,#6366f1,#8b5cf6); }
        .ai-msg-avatar.user-av { background:linear-gradient(135deg,#ec4899,#f97316);color:#fff;font-size:11px;font-weight:800; }
        .ai-msg-body { max-width:80%; }
        .ai-msg-bubble {
          padding:10px 14px;border-radius:18px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;
          font-size:13px;font-weight:500;line-height:1.65;
        }
        .ai-msg.ai .ai-msg-bubble {
          border-radius:4px 18px 18px 18px;
          background:${dark?"rgba(99,102,241,.12)":"rgba(99,102,241,.07)"};
          color:${dark?"#e2e8f0":"#1e293b"};
          border:1px solid ${dark?"rgba(99,102,241,.2)":"rgba(99,102,241,.12)"};
        }
        .ai-msg.user .ai-msg-bubble {
          border-radius:18px 4px 18px 18px;
          background:linear-gradient(135deg,#6366f1,#8b5cf6);
          color:#fff;
        }
        .ai-msg-time { font-size:10px;color:${dark?"#64748b":"#94a3b8"};margin-top:4px;font-weight:500; }
        .ai-msg.user .ai-msg-time { text-align:right; }

        .ai-typing {
          display:flex;gap:8px;animation:msgIn .28s ease both;
        }
        .ai-typing-bubble {
          padding:12px 16px;border-radius:4px 18px 18px 18px;
          background:${dark?"rgba(99,102,241,.12)":"rgba(99,102,241,.07)"};
          border:1px solid ${dark?"rgba(99,102,241,.2)":"rgba(99,102,241,.12)"};
          display:flex;gap:5px;align-items:center;
        }
        .ai-dot {
          width:7px;height:7px;border-radius:50%;
          background:${dark?"#818cf8":"#6366f1"};
        }
        .ai-dot:nth-child(1){animation:typingDot 1.2s ease infinite}
        .ai-dot:nth-child(2){animation:typingDot 1.2s ease .2s infinite}
        .ai-dot:nth-child(3){animation:typingDot 1.2s ease .4s infinite}

        .ai-quick-prompts {
          padding:10px 14px;border-top:1px solid ${dark?"rgba(255,255,255,.06)":"rgba(99,102,241,.08)"};
          display:flex;gap:6px;overflow-x:auto;flex-shrink:0;
          scrollbar-width:none;
        }
        .ai-quick-prompts::-webkit-scrollbar{display:none;}
        .ai-qprompt {
          padding:6px 12px;border-radius:20px;border:1.5px solid ${dark?"rgba(99,102,241,.3)":"rgba(99,102,241,.2)"};
          background:${dark?"rgba(99,102,241,.08)":"rgba(99,102,241,.04)"};
          color:${dark?"#a5b4fc":"#6366f1"};
          font-family:'Plus Jakarta Sans',system-ui,sans-serif;
          font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap;
          transition:all .18s;
        }
        .ai-qprompt:hover {
          background:linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.15));
          border-color:rgba(99,102,241,.4);transform:translateY(-1px);
        }

        .ai-input-row {
          padding:12px 14px;border-top:1px solid ${dark?"rgba(255,255,255,.07)":"rgba(99,102,241,.1)"};
          display:flex;align-items:flex-end;gap:8px;flex-shrink:0;
          background:${dark?"rgba(21,28,46,.95)":"rgba(249,250,251,.95)"};
        }
        .ai-input {
          flex:1;padding:10px 14px;border-radius:16px;
          border:1.5px solid ${dark?"rgba(99,102,241,.25)":"rgba(99,102,241,.2)"};
          background:${dark?"rgba(99,102,241,.07)":"#fff"};
          color:${dark?"#e2e8f0":"#1e293b"};
          font-family:'Plus Jakarta Sans',system-ui,sans-serif;
          font-size:13px;font-weight:500;outline:none;resize:none;
          max-height:100px;line-height:1.5;
          transition:border .2s,box-shadow .2s;
        }
        .ai-input::placeholder{color:${dark?"#64748b":"#94a3b8"};}
        .ai-input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.1);}
        .ai-send {
          width:40px;height:40px;border-radius:12px;border:none;cursor:pointer;
          background:linear-gradient(135deg,#6366f1,#8b5cf6);
          color:#fff;font-size:16px;display:flex;align-items:center;justify-content:center;
          box-shadow:0 4px 14px rgba(99,102,241,.4);
          transition:all .2s;flex-shrink:0;
        }
        .ai-send:hover:not(:disabled){transform:scale(1.08);box-shadow:0 6px 18px rgba(99,102,241,.5);}
        .ai-send:disabled{opacity:.4;cursor:not-allowed;}

        @media(max-width:480px){
          .ai-fab-wrap { bottom:16px;right:16px; }
          .ai-chat-panel { bottom:92px;right:16px;width:calc(100vw - 32px);height:calc(100vh - 120px);border-radius:20px; }
          .ai-fab { width:54px;height:54px;font-size:22px; }
        }
        @media(max-width:360px){
          .ai-fab-wrap { bottom:12px;right:12px; }
          .ai-chat-panel { right:12px;width:calc(100vw - 24px); }
        }
      `}</style>

      {/* Chat Panel */}
      {open && (
        <div className={`ai-chat-panel${minimized ? " minimized" : ""}`}>
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-avatar" style={{ position:"relative" }}>
              🤖
              <div className="ai-online-dot"/>
            </div>
            <div className="ai-chat-hinfo">
              <div className="ai-chat-hname">AI Study Assistant</div>
              <div className="ai-chat-hstatus">
                <span style={{ width:7,height:7,borderRadius:"50%",background:"#34d399",display:"inline-block" }}/>
                Online · Always ready to help
              </div>
            </div>
            <div className="ai-chat-hbtns">
              <button className="ai-chat-hbtn" onClick={() => setMinimized(m => !m)} title={minimized?"Expand":"Minimize"}>
                {minimized ? "⬆" : "⬇"}
              </button>
              <button className="ai-chat-hbtn" onClick={() => setOpen(false)} title="Close">✕</button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Subject Bar */}
              {currentSubject && (
                <div className="ai-subject-bar">
                  <span style={{ fontSize:11.5, fontWeight:700, color: dark?"#94a3b8":"#64748b" }}>Helping with:</span>
                  <span className="ai-subject-tag" style={{
                    background: SUBJECT_META[currentSubject]?.bg || "rgba(99,102,241,.1)",
                    color: SUBJECT_META[currentSubject]?.color || "#6366f1"
                  }}>{currentSubject}</span>
                  {currentQuestion && <span style={{ fontSize:11,color: dark?"#64748b":"#94a3b8",fontWeight:600 }}>· {currentQuestion}</span>}
                </div>
              )}

              {/* Messages */}
              <div className="ai-messages">
                {messages.map(msg => (
                  <div key={msg.id} className={`ai-msg ${msg.from}`}>
                    <div className={`ai-msg-avatar ${msg.from === "ai" ? "ai-av" : "user-av"}`}>
                      {msg.from === "ai" ? "🤖" : "S"}
                    </div>
                    <div className="ai-msg-body">
                      <div className="ai-msg-bubble">{msg.text}</div>
                      <div className="ai-msg-time">{fmtTime(msg.time)}</div>
                    </div>
                  </div>
                ))}
                {typing && (
                  <div className="ai-typing">
                    <div className="ai-msg-avatar ai-av">🤖</div>
                    <div className="ai-typing-bubble">
                      <div className="ai-dot"/><div className="ai-dot"/><div className="ai-dot"/>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef}/>
              </div>

              {/* Quick Prompts */}
              <div className="ai-quick-prompts">
                {QUICK_PROMPTS.map((p, i) => (
                  <button key={i} className="ai-qprompt" onClick={() => sendMessage(p)}>{p}</button>
                ))}
              </div>

              {/* Input */}
              <div className="ai-input-row">
                <textarea
                  ref={inputRef}
                  className="ai-input"
                  placeholder="Ask me anything about your homework…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  rows={1}
                />
                <button className="ai-send" onClick={() => sendMessage()} disabled={!input.trim() || typing} title="Send">
                  ➤
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* FAB */}
      <div className="ai-fab-wrap">
        {!open && <div className="ai-fab-label">✨ Ask AI for Help</div>}
        <button className={`ai-fab${shake ? " shake" : ""}`} onClick={() => { setOpen(o => !o); setUnread(0); }} title="AI Study Assistant">
          {!open && <><div className="ai-fab-ripple"/><div className="ai-fab-ripple2"/></>}
          {open ? "✕" : "🤖"}
          {unread > 0 && !open && <div className="ai-fab-badge">{unread}</div>}
        </button>
      </div>
    </>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

:root{
  --brand:#6366f1;--brand2:#8b5cf6;--brand3:#ec4899;
  --success:#10b981;--warning:#f59e0b;--danger:#ef4444;--sky:#0ea5e9;
  --bg-app:#f8fafc;--surface:#fff;--surface2:#f8fafc;--surface3:#f1f5f9;
  --border:rgba(0,0,0,.06);--border2:rgba(0,0,0,.1);
  --text:#0f172a;--text2:#374151;--muted:#64748b;--subtle:#94a3b8;
  --shadow:0 2px 12px rgba(0,0,0,.06);
  --shadow-md:0 4px 20px rgba(0,0,0,.09);
  --shadow-lg:0 8px 36px rgba(0,0,0,.13);
  --radius:20px;--radius-sm:14px;
}
.dark{
  --bg-app:#0d111e;--surface:#151c2e;--surface2:#1a2238;--surface3:#1e2840;
  --border:rgba(255,255,255,.07);--border2:rgba(255,255,255,.12);
  --text:#f1f5f9;--text2:#cbd5e1;--muted:#94a3b8;--subtle:#64748b;
  --shadow:0 2px 12px rgba(0,0,0,.35);
  --shadow-md:0 4px 20px rgba(0,0,0,.4);
  --shadow-lg:0 8px 36px rgba(0,0,0,.5);
}

::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:10px;}

.hw-root{font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:var(--bg-app);min-height:100vh;color:var(--text);transition:background .3s,color .3s;}
.hw-ambient{position:fixed;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(ellipse 65% 50% at 80% 10%,rgba(99,102,241,.06),transparent),
             radial-gradient(ellipse 50% 55% at 10% 85%,rgba(139,92,246,.05),transparent);}
.dark .hw-ambient{background:radial-gradient(ellipse 65% 50% at 80% 10%,rgba(99,102,241,.09),transparent),
  radial-gradient(ellipse 50% 55% at 10% 85%,rgba(139,92,246,.07),transparent);}

.hw-topbar{position:sticky;top:0;z-index:300;height:60px;display:flex;align-items:center;gap:12px;padding:0 24px;
  background:rgba(255,255,255,.88);border-bottom:1px solid var(--border);backdrop-filter:blur(16px);
  box-shadow:0 2px 12px rgba(0,0,0,.04);transition:background .3s;}
.dark .hw-topbar{background:rgba(21,28,46,.9);}
.hw-logo-icon{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgba(99,102,241,.35);flex-shrink:0;}
.hw-logo-text{font-size:15px;font-weight:800;color:var(--text);letter-spacing:-.2px;}
.hw-topbar-sep{width:1px;height:22px;background:var(--border2);flex-shrink:0;}
.hw-breadcrumb{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--muted);}
.hw-bc-link{cursor:pointer;color:var(--brand);transition:opacity .15s;} .hw-bc-link:hover{opacity:.7;}
.hw-bc-active{color:var(--text);font-weight:700;}
.hw-topbar-right{margin-left:auto;display:flex;align-items:center;gap:8px;}
.hw-topbar-pill{display:inline-flex;align-items:center;gap:5px;padding:5px 13px;border-radius:20px;font-size:11.5px;font-weight:700;background:rgba(99,102,241,.1);color:var(--brand);border:1px solid rgba(99,102,241,.2);}
.dark .hw-topbar-pill{background:rgba(99,102,241,.18);color:#a5b4fc;}
.hw-theme-btn{width:36px;height:36px;border-radius:10px;border:1.5px solid var(--border2);background:var(--surface2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;transition:all .18s;}
.hw-theme-btn:hover{background:var(--surface3);transform:scale(1.06);}

.hw-hero{margin:20px 28px 0;border-radius:var(--radius);padding:22px 28px;
  background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);
  position:relative;overflow:hidden;color:#fff;
  box-shadow:0 8px 28px rgba(99,102,241,.3);}
.hw-hero::before{content:'';position:absolute;top:-70px;right:-70px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.09);pointer-events:none;}
.hw-hero::after{content:'';position:absolute;bottom:-60px;left:25%;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.06);pointer-events:none;}
.hw-hero-in{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.hw-hero-left{display:flex;align-items:center;gap:16px;}
.hw-hero-avatar{width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.25);border:2.5px solid rgba(255,255,255,.5);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;flex-shrink:0;}
.hw-hero-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 11px;border-radius:20px;margin-bottom:6px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.28);font-size:10.5px;font-weight:700;color:#fff;}
.hw-hero-title{font-size:clamp(17px,2.5vw,24px);font-weight:800;color:#fff;letter-spacing:-.3px;line-height:1.2;margin-bottom:3px;}
.hw-hero-sub{font-size:12px;color:rgba(255,255,255,.72);line-height:1.5;}
.hw-hero-right{display:flex;align-items:center;gap:10px;flex-shrink:0;}
.hw-hstat{text-align:center;padding:10px 16px;border-radius:14px;min-width:62px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(8px);transition:transform .2s;cursor:default;}
.hw-hstat:hover{transform:translateY(-2px);}
.hw-hstat-n{font-size:20px;font-weight:800;color:#fff;line-height:1;}
.hw-hstat-l{font-size:9.5px;color:rgba(255,255,255,.65);margin-top:2px;font-weight:600;}
.hw-hero-btn{padding:10px 20px;background:#fff;color:#6366f1;border:none;border-radius:13px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.15);white-space:nowrap;transition:all .2s;}
.hw-hero-btn:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(0,0,0,.2);background:#f5f3ff;}

.hw-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:20px 28px 0;}
@keyframes scardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.hw-scard{background:var(--surface);border-radius:var(--radius);padding:20px;border:1px solid var(--border);box-shadow:var(--shadow);transition:all .28s cubic-bezier(.4,0,.2,1);animation:scardIn .5s cubic-bezier(.34,1.56,.64,1) both;position:relative;overflow:hidden;}
.hw-scard:hover{transform:translateY(-6px) scale(1.01);box-shadow:var(--shadow-lg);}
.hw-scard.blue{border-top:3px solid #6366f1;}.hw-scard.green{border-top:3px solid #10b981;}.hw-scard.amber{border-top:3px solid #f59e0b;}.hw-scard.purple{border-top:3px solid #8b5cf6;}
.hw-scard-icon{width:40px;height:40px;border-radius:12px;margin-bottom:12px;display:flex;align-items:center;justify-content:center;font-size:18px;}
.hw-scard.blue .hw-scard-icon{background:rgba(99,102,241,.1);}.hw-scard.green .hw-scard-icon{background:rgba(16,185,129,.1);}.hw-scard.amber .hw-scard-icon{background:rgba(245,158,11,.1);}.hw-scard.purple .hw-scard-icon{background:rgba(139,92,246,.1);}
.hw-scard-n{font-size:32px;font-weight:800;color:var(--text);letter-spacing:-1.5px;line-height:1;}
.hw-scard-l{font-size:12.5px;color:var(--muted);margin-top:4px;font-weight:500;}
.hw-scard-sub{font-size:11.5px;color:var(--success);margin-top:6px;font-weight:600;}

.hw-body{padding:20px 28px 100px;}
.hw-panel{background:var(--surface);border-radius:var(--radius);border:1px solid var(--border);box-shadow:var(--shadow);overflow:hidden;}
.hw-panel-head{padding:18px 22px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.hw-panel-title{font-size:15px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:8px;}
.hw-panel-sub{font-size:12px;color:var(--muted);margin-top:3px;}
.hw-panel-body{padding:20px 22px;}
.hw-view-all{font-size:12.5px;font-weight:700;color:var(--brand);border:none;background:none;cursor:pointer;font-family:inherit;padding:6px 12px;border-radius:8px;transition:background .15s;}
.hw-view-all:hover{background:rgba(99,102,241,.08);}

.hw-filter-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;}
.hw-search-wrap{position:relative;flex:1;min-width:200px;}
.hw-search{width:100%;padding:10px 14px 10px 38px;border-radius:12px;border:1.5px solid var(--border2);background:var(--surface2);font-family:inherit;font-size:13.5px;font-weight:500;color:var(--text);outline:none;transition:border .2s,box-shadow .2s;}
.hw-search::placeholder{color:var(--subtle);}
.hw-search:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(99,102,241,.1);}
.hw-search-ico{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--subtle);font-size:14px;pointer-events:none;}
.hw-fchip{padding:7px 14px;border-radius:20px;border:1.5px solid var(--border2);background:var(--surface2);font-size:12px;font-weight:600;color:var(--muted);cursor:pointer;font-family:inherit;transition:all .18s;white-space:nowrap;}
.hw-fchip:hover{border-color:var(--brand);color:var(--brand);}
.hw-fchip.on{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-color:transparent;box-shadow:0 3px 10px rgba(99,102,241,.3);}

.hw-sec-title{font-size:11.5px;font-weight:800;color:var(--subtle);text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px;display:flex;align-items:center;gap:8px;}
.hw-sec-title::after{content:'';flex:1;height:1px;background:var(--border);}

.hw-ag{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:16px;}

.hw-acard{border-radius:var(--radius);border:2px solid var(--border);background:var(--surface);overflow:hidden;cursor:pointer;display:flex;flex-direction:column;transition:all .24s cubic-bezier(.4,0,.2,1);}
.hw-acard:hover{transform:translateY(-6px);box-shadow:0 16px 40px rgba(99,102,241,.14);border-color:rgba(99,102,241,.3);}
.hw-acard-banner{height:5px;background:linear-gradient(90deg,var(--c1),var(--c2));}
.hw-acard-inner{padding:18px 18px 14px;flex:1;display:flex;flex-direction:column;}
.hw-acard-top{display:flex;align-items:flex-start;gap:12px;margin-bottom:10px;}
.hw-acard-emoji{font-size:32px;flex-shrink:0;}
.hw-acard-info{flex:1;min-width:0;}
.hw-acard-topic{font-size:14.5px;font-weight:800;color:var(--text);line-height:1.3;margin-bottom:4px;}
.hw-acard-subj{font-size:11.5px;font-weight:700;padding:3px 10px;border-radius:8px;display:inline-block;margin-bottom:2px;}
.hw-acard-grade{font-size:11px;color:var(--muted);font-weight:500;}
.hw-acard-desc{font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:10px;flex:1;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.hw-acard-tags{display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-bottom:10px;}
.hw-atag{font-size:10.5px;font-weight:600;padding:3px 9px;border-radius:7px;background:var(--surface2);color:var(--muted);border:1px solid var(--border);}
.hw-astatus{font-size:10px;font-weight:800;padding:3px 10px;border-radius:7px;text-transform:uppercase;letter-spacing:.04em;margin-left:auto;}
.hw-astatus.pending{background:rgba(245,158,11,.1);color:#d97706;}
.hw-astatus.in-progress{background:rgba(99,102,241,.1);color:var(--brand);}
.hw-astatus.submitted{background:rgba(14,165,233,.1);color:#0284c7;}
.hw-astatus.graded{background:rgba(16,185,129,.1);color:#059669;}
.hw-mini-prog-bg{height:5px;background:var(--surface3);border-radius:5px;overflow:hidden;margin-bottom:3px;}
.hw-mini-prog-fill{height:100%;border-radius:5px;transition:width .8s;}
.hw-mini-prog-lbl{font-size:10.5px;color:var(--subtle);font-weight:600;}
.hw-acard-foot{padding:12px 18px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.hw-acard-meta-lbl{font-size:11.5px;color:var(--muted);font-weight:600;}
.hw-acard-btn{padding:7px 16px;border-radius:10px;border:none;font-family:inherit;font-size:12px;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 3px 10px rgba(99,102,241,.3);transition:all .2s;}
.hw-acard-btn:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(99,102,241,.4);}
.hw-acard-btn.sub{background:linear-gradient(135deg,#0ea5e9,#6366f1);}.hw-acard-btn.grad{background:linear-gradient(135deg,#10b981,#0ea5e9);}

.hw-syl-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;}
.hw-syl-card{border-radius:var(--radius-sm);padding:16px 12px;text-align:center;border:1.5px solid transparent;position:relative;overflow:hidden;transition:all .22s cubic-bezier(.34,1.56,.64,1);background:var(--surface);}
.hw-syl-card:hover{transform:translateY(-4px) scale(1.02);box-shadow:var(--shadow-md);}
.hw-syl-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;}
.hw-syl-card.math{border-color:rgba(99,102,241,.2);background:rgba(99,102,241,.04);}.hw-syl-card.math::before{background:linear-gradient(90deg,#6366f1,#8b5cf6);}
.hw-syl-card.bio{border-color:rgba(16,185,129,.2);background:rgba(16,185,129,.04);}.hw-syl-card.bio::before{background:linear-gradient(90deg,#10b981,#34d399);}
.hw-syl-card.hist{border-color:rgba(139,92,246,.2);background:rgba(139,92,246,.04);}.hw-syl-card.hist::before{background:linear-gradient(90deg,#8b5cf6,#a78bfa);}
.hw-syl-card.phys{border-color:rgba(236,72,153,.2);background:rgba(236,72,153,.04);}.hw-syl-card.phys::before{background:linear-gradient(90deg,#ec4899,#f97316);}
.hw-syl-card.cs{border-color:rgba(14,165,233,.2);background:rgba(14,165,233,.04);}.hw-syl-card.cs::before{background:linear-gradient(90deg,#0ea5e9,#6366f1);}
.dark .hw-syl-card.math{background:rgba(99,102,241,.09);}.dark .hw-syl-card.bio{background:rgba(16,185,129,.09);}
.dark .hw-syl-card.hist{background:rgba(139,92,246,.09);}.dark .hw-syl-card.phys{background:rgba(236,72,153,.09);}
.dark .hw-syl-card.cs{background:rgba(14,165,233,.09);}
.hw-syl-emoji{font-size:24px;display:block;margin-bottom:8px;}
.hw-syl-name{font-size:11.5px;font-weight:700;color:var(--text);margin-bottom:8px;}
.hw-syl-ring-wrap{position:relative;width:60px;height:60px;margin:0 auto 6px;}
.hw-syl-ring-wrap svg{width:60px;height:60px;transform:rotate(-90deg);}
.hw-syl-ring-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;}
.hw-syl-sub{font-size:10px;color:var(--subtle);font-weight:500;}

.hw-ach-row{display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px;}
.hw-ach-row::-webkit-scrollbar{display:none;}
.hw-ach-item{flex-shrink:0;border-radius:var(--radius-sm);padding:14px 16px;text-align:center;min-width:128px;border:1.5px solid transparent;position:relative;overflow:hidden;transition:all .22s cubic-bezier(.34,1.56,.64,1);}
.hw-ach-item:hover{transform:translateY(-4px) scale(1.02);box-shadow:var(--shadow-md);}
.hw-ach-item::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;}
.hw-ach-item.yellow{background:linear-gradient(135deg,#fffbeb,#fef3c7);border-color:#fde68a;}.hw-ach-item.yellow::before{background:linear-gradient(90deg,#f59e0b,#fbbf24);}
.hw-ach-item.green{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-color:#bbf7d0;}.hw-ach-item.green::before{background:linear-gradient(90deg,#10b981,#34d399);}
.hw-ach-item.purple{background:linear-gradient(135deg,#faf5ff,#ede9fe);border-color:#ddd6fe;}.hw-ach-item.purple::before{background:linear-gradient(90deg,#8b5cf6,#a78bfa);}
.hw-ach-item.blue{background:linear-gradient(135deg,#eff6ff,#dbeafe);border-color:#bfdbfe;}.hw-ach-item.blue::before{background:linear-gradient(90deg,#3b82f6,#60a5fa);}
.dark .hw-ach-item.yellow{background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.3);}
.dark .hw-ach-item.green{background:rgba(16,185,129,.12);border-color:rgba(16,185,129,.3);}
.dark .hw-ach-item.purple{background:rgba(139,92,246,.12);border-color:rgba(139,92,246,.3);}
.dark .hw-ach-item.blue{background:rgba(59,130,246,.12);border-color:rgba(59,130,246,.3);}
.hw-ach-icon{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:20px;box-shadow:0 4px 14px rgba(0,0,0,.12);}
.hw-ach-icon.y{background:linear-gradient(135deg,#f59e0b,#fbbf24);}.hw-ach-icon.g{background:linear-gradient(135deg,#10b981,#34d399);}
.hw-ach-icon.p{background:linear-gradient(135deg,#8b5cf6,#a78bfa);}.hw-ach-icon.b{background:linear-gradient(135deg,#3b82f6,#60a5fa);}
.hw-ach-name{font-size:12px;font-weight:700;color:var(--text);}
.hw-ach-desc{font-size:10.5px;color:var(--subtle);margin-top:2px;}

.hw-p2hero{margin:20px 28px 0;border-radius:var(--radius);padding:18px 24px;
  background:linear-gradient(135deg,var(--c1,#6366f1),var(--c2,#8b5cf6));
  color:#fff;box-shadow:0 6px 24px rgba(0,0,0,.18);position:relative;overflow:hidden;}
.hw-p2hero::before{content:'';position:absolute;top:-50px;right:-50px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.08);}
.hw-p2hero::after{content:'';position:absolute;bottom:-40px;left:20%;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,.05);}
.hw-p2hero-in{position:relative;z-index:1;display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.hw-p2-back{width:40px;height:40px;border-radius:11px;border:1.5px solid rgba(255,255,255,.35);background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;font-size:18px;transition:all .2s;backdrop-filter:blur(6px);}
.hw-p2-back:hover{background:rgba(255,255,255,.28);transform:translateX(-2px);}
.hw-p2hero-emoji{font-size:32px;flex-shrink:0;filter:drop-shadow(0 4px 8px rgba(0,0,0,.22));}
.hw-p2hero-body{flex:1;min-width:0;}
.hw-p2hero-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:10px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.25);font-size:10.5px;font-weight:700;color:rgba(255,255,255,.9);margin-bottom:5px;}
.hw-p2hero-title{font-size:clamp(15px,2vw,20px);font-weight:800;color:#fff;margin-bottom:4px;line-height:1.2;}
.hw-p2hero-meta{display:flex;flex-wrap:wrap;gap:10px;}
.hw-p2hero-mi{display:flex;align-items:center;gap:4px;font-size:11.5px;color:rgba(255,255,255,.8);font-weight:600;}
.hw-p2hero-right{display:flex;align-items:center;gap:12px;flex-shrink:0;}
.hw-p2-div{width:1px;height:34px;background:rgba(255,255,255,.2);}
.hw-p2-sitem{text-align:center;}
.hw-p2-sn{font-size:20px;font-weight:800;color:#fff;line-height:1;}
.hw-p2-sl{font-size:9.5px;color:rgba(255,255,255,.6);margin-top:2px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;}

.hw-p2body{padding:20px 28px 100px;display:flex;gap:16px;align-items:flex-start;}
.hw-p2left{width:256px;flex-shrink:0;position:sticky;top:76px;}
.hw-p2right{flex:1;min-width:0;}

.hw-qidx{background:var(--surface);border-radius:var(--radius);border:1px solid var(--border);box-shadow:var(--shadow);overflow:hidden;}
.hw-qidx-head{padding:14px 16px;border-bottom:1px solid var(--border);font-size:11.5px;font-weight:800;color:var(--subtle);text-transform:uppercase;letter-spacing:.09em;}
.hw-qidx-list{padding:10px;}
.hw-qi-btn{width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:11px;border:none;background:transparent;cursor:pointer;font-family:inherit;text-align:left;transition:all .18s;margin-bottom:4px;}
.hw-qi-btn:last-child{margin-bottom:0;}.hw-qi-btn:hover{background:rgba(99,102,241,.07);}
.hw-qi-btn.cur{background:linear-gradient(135deg,rgba(99,102,241,.12),rgba(139,92,246,.08));border:1px solid rgba(99,102,241,.25);}
.hw-qi-btn.done{background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.2);}
.hw-qi-dot{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;}
.hw-qi-btn.cur .hw-qi-dot{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;}
.hw-qi-btn.done .hw-qi-dot{background:linear-gradient(135deg,#10b981,#34d399);color:#fff;}
.hw-qi-btn:not(.cur):not(.done) .hw-qi-dot{background:var(--surface2);color:var(--muted);}
.hw-qi-info{flex:1;min-width:0;}
.hw-qi-label{font-size:12px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.hw-qi-meta{font-size:10.5px;color:var(--muted);font-weight:500;}

@keyframes qcardIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.hw-qcard{background:var(--surface);border-radius:var(--radius);border:1px solid var(--border);box-shadow:var(--shadow);overflow:hidden;animation:qcardIn .38s cubic-bezier(.34,1.56,.64,1) both;}
.hw-qcard-accent{height:4px;background:linear-gradient(90deg,var(--tc,#6366f1),transparent);}
.hw-qcard-head{display:flex;align-items:center;gap:12px;padding:18px 22px 14px;border-bottom:1px solid var(--border);}
.hw-qcard-icon-box{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;background:var(--surface2);}
.hw-qcard-type{font-size:14px;font-weight:800;color:var(--text);}
.hw-qcard-num{font-size:11.5px;color:var(--subtle);margin-top:1px;font-weight:500;}
.hw-qcard-marks{margin-left:auto;display:flex;align-items:center;gap:5px;font-size:12px;font-weight:800;padding:6px 14px;border-radius:20px;background:rgba(245,158,11,.1);color:#d97706;border:1px solid rgba(245,158,11,.2);flex-shrink:0;}
.dark .hw-qcard-marks{color:#fde68a;}
.hw-qcard-body{padding:22px;}
.hw-qtext{font-size:15.5px;font-weight:600;color:var(--text);line-height:1.75;margin-bottom:18px;user-select:none;-webkit-user-select:none;}
.hw-hint{display:flex;gap:9px;padding:12px 15px;border-radius:13px;margin-bottom:16px;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.22);}
.hw-hint-t{font-size:12.5px;color:#92400e;font-weight:500;line-height:1.6;}
.dark .hw-hint-t{color:#fde68a;}

.hw-opts{display:flex;flex-direction:column;gap:9px;}
.hw-opt{display:flex;align-items:center;gap:13px;padding:13px 16px;border-radius:14px;border:2px solid var(--border2);cursor:pointer;font-size:14px;font-weight:500;color:var(--muted);transition:all .2s;user-select:none;background:var(--surface2);}
.hw-opt:hover{border-color:var(--brand);color:var(--text);transform:translateX(3px);}
.hw-opt.sel{border-color:var(--brand);background:rgba(99,102,241,.08);color:#4338ca;font-weight:600;}
.hw-opt.correct{border-color:var(--success);background:rgba(16,185,129,.07);color:#065f46;}
.hw-opt.wrong{border-color:var(--danger);background:rgba(239,68,68,.06);color:#991b1b;}
.dark .hw-opt.sel{background:rgba(99,102,241,.18);color:#a5b4fc;}.dark .hw-opt.correct{background:rgba(16,185,129,.15);color:#6ee7b7;}.dark .hw-opt.wrong{background:rgba(239,68,68,.14);color:#fca5a5;}
.hw-opt-ltr{width:30px;height:30px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;border:2px solid currentColor;transition:all .18s;}
.hw-opt.sel .hw-opt-ltr{background:var(--brand);color:#fff;border-color:var(--brand);}
.hw-opt.correct .hw-opt-ltr{background:var(--success);color:#fff;border-color:var(--success);}
.hw-opt.wrong .hw-opt-ltr{background:var(--danger);color:#fff;border-color:var(--danger);}

.hw-type-notice{display:flex;align-items:center;gap:7px;margin-bottom:10px;font-size:12.5px;font-weight:600;color:var(--muted);}
.hw-nb{padding:2px 9px;border-radius:7px;background:rgba(99,102,241,.1);color:var(--brand);font-weight:700;}
.dark .hw-nb{background:rgba(99,102,241,.2);color:#a5b4fc;}
.hw-ta{width:100%;padding:14px 16px;border-radius:14px;border:2px solid var(--border2);background:var(--surface2);color:var(--text);font-family:inherit;font-size:14.5px;font-weight:500;line-height:1.85;resize:vertical;outline:none;transition:border .2s,box-shadow .2s;
  background-image:repeating-linear-gradient(transparent,transparent 36px,rgba(99,102,241,.06) 36px,rgba(99,102,241,.06) 37px);background-attachment:local;}
.hw-ta:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(99,102,241,.1);background:var(--surface);}
.hw-ta::placeholder{color:var(--subtle);font-style:italic;}.hw-ta:read-only{opacity:.54;cursor:default;}
.dark .hw-ta{background:rgba(255,255,255,.04);}.dark .hw-ta:focus{background:rgba(99,102,241,.07);}
.hw-pwarn{display:flex;align-items:center;gap:8px;margin-top:8px;padding:9px 14px;border-radius:11px;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.22);font-size:12.5px;font-weight:600;color:var(--danger);}
.hw-wc{display:flex;align-items:center;gap:10px;margin-top:8px;}
.hw-wc-n{font-size:11.5px;font-weight:700;color:var(--subtle);white-space:nowrap;}
.hw-wc-n.ok{color:var(--success);}.hw-wc-n.warn{color:var(--warning);}
.hw-wc-track{flex:1;height:5px;background:var(--surface3);border-radius:5px;overflow:hidden;}
.hw-wc-fill{height:100%;border-radius:5px;transition:width .4s,background .3s;}

.hw-dropzone{border:2.5px dashed rgba(99,102,241,.3);border-radius:16px;padding:30px 20px;text-align:center;cursor:pointer;transition:all .2s;background:rgba(99,102,241,.03);position:relative;}
.hw-dropzone:hover,.hw-dropzone.drag{border-color:var(--brand);background:rgba(99,102,241,.07);}
.dark .hw-dropzone{background:rgba(99,102,241,.05);}
.hw-dropzone input{position:absolute;inset:0;opacity:0;cursor:pointer;}
.hw-dz-icon{font-size:38px;margin-bottom:10px;display:block;}
.hw-dz-title{font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px;}
.hw-dz-sub{font-size:12px;color:var(--muted);}
.hw-upload-preview{border-radius:14px;border:1.5px solid var(--border);overflow:hidden;background:var(--surface2);}
.hw-upload-preview img{width:100%;max-height:280px;object-fit:contain;display:block;}
.hw-upload-info{display:flex;align-items:center;gap:10px;padding:10px 14px;}
.hw-upload-name{flex:1;font-size:12.5px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.hw-upload-sz{font-size:11.5px;color:var(--muted);}
.hw-upload-rm{width:28px;height:28px;border-radius:8px;border:1.5px solid var(--border2);background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px;}
.hw-upload-doc{display:flex;align-items:center;gap:12px;padding:16px;border-radius:14px;border:1.5px solid var(--border);background:var(--surface2);}
.hw-accepted{font-size:11.5px;color:var(--subtle);text-align:center;margin-top:6px;}

.hw-speech{display:flex;flex-direction:column;align-items:center;gap:16px;padding:8px 0;}
.hw-mic-wrap{position:relative;width:96px;height:96px;display:flex;align-items:center;justify-content:center;}
@keyframes mring{0%{opacity:.55;transform:scale(.58)}100%{opacity:0;transform:scale(1)}}
.hw-mic-ring{position:absolute;inset:-14px;border-radius:50%;border:2px solid var(--brand);opacity:0;animation:mring 2s ease-out infinite;}
.hw-mic-ring2{position:absolute;inset:-28px;border-radius:50%;border:2px solid var(--brand2);opacity:0;animation:mring 2s ease-out .5s infinite;}
@keyframes recP{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
.hw-mic{width:72px;height:72px;border-radius:50%;border:none;cursor:pointer;color:#fff;background:linear-gradient(135deg,var(--brand),var(--brand2));box-shadow:0 8px 26px rgba(99,102,241,.42);display:flex;align-items:center;justify-content:center;font-size:26px;transition:all .22s;}
.hw-mic.rec{background:linear-gradient(135deg,#ef4444,#f97316);box-shadow:0 8px 26px rgba(239,68,68,.42);animation:recP 1s ease-in-out infinite;}
.hw-mic:disabled{opacity:.5;cursor:not-allowed;}
.hw-transcript{width:100%;padding:14px 16px;border-radius:13px;min-height:56px;border:2px dashed rgba(99,102,241,.28);background:rgba(99,102,241,.04);font-size:13.5px;color:var(--muted);line-height:1.7;font-style:italic;}
.dark .hw-transcript{background:rgba(99,102,241,.08);}

@keyframes fbIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
.hw-fb{padding:16px 22px;border-top:1px solid;animation:fbIn .32s ease both;}
.hw-fb.correct{border-color:rgba(16,185,129,.2);background:rgba(16,185,129,.05);}
.hw-fb.partial{border-color:rgba(245,158,11,.2);background:rgba(245,158,11,.06);}
.hw-fb.wrong{border-color:rgba(239,68,68,.18);background:rgba(239,68,68,.04);}
.hw-fbh{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;}
.hw-fbv{font-size:13.5px;font-weight:800;}
.hw-fb.correct .hw-fbv{color:#059669;}.hw-fb.partial .hw-fbv{color:#d97706;}.hw-fb.wrong .hw-fbv{color:var(--danger);}
.dark .hw-fb.correct .hw-fbv{color:#6ee7b7;}.dark .hw-fb.partial .hw-fbv{color:#fde68a;}.dark .hw-fb.wrong .hw-fbv{color:#fca5a5;}
.hw-fbs{font-size:13px;font-weight:800;padding:3px 12px;border-radius:8px;}
.hw-fb.correct .hw-fbs{background:rgba(16,185,129,.1);color:#059669;}
.hw-fb.partial .hw-fbs{background:rgba(245,158,11,.1);color:#d97706;}
.hw-fb.wrong .hw-fbs{background:rgba(239,68,68,.08);color:var(--danger);}
.dark .hw-fb.correct .hw-fbs{color:#6ee7b7;}.dark .hw-fb.partial .hw-fbs{color:#fde68a;}.dark .hw-fb.wrong .hw-fbs{color:#fca5a5;}
.hw-fbc{font-size:13px;color:var(--muted);font-weight:500;line-height:1.6;}

.hw-actions{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid var(--border);flex-wrap:wrap;}
.hw-btn-sub{display:inline-flex;align-items:center;gap:7px;padding:11px 24px;border-radius:13px;border:none;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:700;color:#fff;background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 4px 14px rgba(99,102,241,.3);transition:all .22s;}
.hw-btn-sub:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 22px rgba(99,102,241,.42);}
.hw-btn-sub:active:not(:disabled){transform:scale(.97);}
.hw-btn-sub:disabled{opacity:.38;cursor:not-allowed;}
.hw-btn-sub.done{background:linear-gradient(135deg,#10b981,#059669);}
.hw-btn-nav{display:inline-flex;align-items:center;gap:6px;padding:11px 17px;border-radius:13px;border:1.5px solid var(--border2);background:var(--surface2);cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:var(--muted);transition:all .18s;}
.hw-btn-nav:hover{border-color:rgba(99,102,241,.3);color:var(--brand);}

.hw-done{display:flex;flex-direction:column;align-items:center;padding:44px 28px;text-align:center;gap:8px;}
@keyframes trophyIn{from{opacity:0;transform:scale(0) rotate(-20deg)}to{opacity:1;transform:none}}
.hw-done-trophy{font-size:68px;animation:trophyIn .6s cubic-bezier(.34,1.56,.64,1) both;}
.hw-done-title{font-size:26px;font-weight:800;background:linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.hw-done-score{font-size:54px;font-weight:800;letter-spacing:-2.5px;line-height:1;background:linear-gradient(135deg,#10b981,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.hw-done-score small{font-size:24px;opacity:.6;}
.hw-done-pct{font-size:13.5px;color:var(--muted);font-weight:600;}
.hw-done-bk{width:100%;max-width:380px;margin-top:10px;}
.hw-done-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);}
.hw-done-row:last-child{border-bottom:none;}
.hw-done-l{flex:1;font-size:13px;color:var(--muted);font-weight:500;}
.hw-done-s{font-size:12.5px;font-weight:800;padding:3px 11px;border-radius:8px;}

.hw-mobtabs{display:none;position:sticky;top:60px;z-index:200;background:var(--surface);border-bottom:2px solid var(--border);}
.hw-mobtab-inner{display:flex;padding:0 16px;}
.hw-mobtab{flex:1;padding:11px 8px;font-family:inherit;font-size:13px;font-weight:700;color:var(--subtle);border:none;background:transparent;cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:6px;}
.hw-mobtab.active{color:var(--brand);border-bottom-color:var(--brand);}

.spin{animation:spinIt 1s linear infinite;}
@keyframes spinIt{to{transform:rotate(360deg)}}
@keyframes heroIn{from{opacity:0;transform:translateY(-12px) scale(.98)}to{opacity:1;transform:none}}

@media(max-width:1280px){.hw-ag{grid-template-columns:repeat(2,1fr);}.hw-syl-grid{grid-template-columns:repeat(3,1fr);}}
@media(max-width:1100px){.hw-stats{grid-template-columns:repeat(2,1fr);}.hw-p2left{width:220px;}}
@media(max-width:900px){
  .hw-hero{margin:12px 16px 0;padding:14px 18px;border-radius:16px;}
  .hw-hero-right .hw-hstat:nth-child(3),.hw-hero-right .hw-hstat:nth-child(4){display:none;}
  .hw-stats{padding:12px 16px 0;}.hw-body{padding:12px 16px 80px;}
  .hw-p2hero{margin:12px 16px 0;}.hw-p2body{padding:12px 16px 80px;flex-direction:column;}
  .hw-p2left{width:100%;position:static;}
  .hw-qidx-list{display:flex;gap:6px;flex-wrap:wrap;padding:10px;}
  .hw-qi-btn{width:auto;flex:0 0 auto;padding:7px 10px;margin-bottom:0;}
  .hw-qi-info{display:none;}
  .hw-syl-grid{grid-template-columns:repeat(3,1fr);}
  .hw-mobtabs{display:block;}
}
@media(max-width:768px){
  .hw-hero{margin:10px 12px 0;border-radius:14px;padding:12px 16px;}
  .hw-hero-right{display:none;}.hw-stats{grid-template-columns:repeat(2,1fr);padding:10px 12px 0;gap:10px;}
  .hw-scard{padding:15px;border-radius:16px;}.hw-scard-n{font-size:28px;}
  .hw-ag{grid-template-columns:1fr;}.hw-syl-grid{grid-template-columns:repeat(2,1fr);}
  .hw-body{padding:10px 12px 80px;}.hw-p2hero{padding:12px 16px;}.hw-p2hero-right{display:none;}
  .hw-p2body{padding:10px 12px 80px;}.hw-qcard-head{padding:14px 16px 12px;}.hw-qcard-body{padding:16px;}
  .hw-actions{flex-direction:column;}.hw-btn-sub,.hw-btn-nav{width:100%;justify-content:center;}
  .hw-qtext{font-size:14.5px;}.hw-topbar{padding:0 14px;}
}
@media(max-width:600px){
  .hw-hero{margin:8px 10px 0;padding:12px 14px;border-radius:13px;}.hw-hero-title{font-size:15px;}
  .hw-stats{padding:8px 10px 0;gap:8px;}.hw-scard{padding:13px;border-radius:14px;}.hw-scard-n{font-size:25px;}
  .hw-body{padding:8px 10px 80px;}.hw-p2body{padding:8px 10px 80px;}.hw-syl-grid{grid-template-columns:repeat(2,1fr);}
}
@media(max-width:420px){.hw-hero-title{font-size:14px;}.hw-scard-n{font-size:22px;}.hw-p2hero-title{font-size:14px;}.hw-qtext{font-size:14px;}.hw-ta{font-size:13.5px;}}
@media(max-width:360px){.hw-hero{padding:10px 12px;}.hw-hero-title{font-size:13px;}.hw-scard-n{font-size:20px;}.hw-stats{gap:6px;}.hw-syl-grid{gap:8px;}}
`;

// ── Main Component ────────────────────────────────────────────────────────────
export default function HomeworkPage() {
  const { user } = useAuth();
  const [dark, setDark] = useState(false);
  const [page, setPage] = useState(1);
  const [subject, setSubject] = useState("All");
  const [search, setSearch] = useState("");
  const [selId, setSelId] = useState(null);
  const [curQ, setCurQ] = useState(0);
  const [mcqA, setMcqA] = useState({});
  const [txtA, setTxtA] = useState({});
  const [tsc, setTsc] = useState({});
  const [uploads, setUploads] = useState({});
  const [subd, setSubd] = useState({});
  const [fbk, setFbk] = useState({});
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState(false);
  const [pwarn, setPwarn] = useState(false);
  const [dragging, setDragging] = useState(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    const noPaste = (e) => { e.preventDefault(); const t = e.target; if (t.tagName === "TEXTAREA" || t.tagName === "INPUT") { setPwarn(true); setTimeout(() => setPwarn(false), 2600); } };
    const noCtx = (e) => { const t = e.target; if (t.closest?.(".hw-qtext") || t.closest?.(".hw-opt")) e.preventDefault(); };
    document.addEventListener("paste", noPaste);
    document.addEventListener("contextmenu", noCtx);
    return () => { document.removeEventListener("paste", noPaste); document.removeEventListener("contextmenu", noCtx); };
  }, []);

  useEffect(() => { setCurQ(0); setMcqA({}); setTxtA({}); setSubd({}); setFbk({}); setTsc({}); setUploads({}); setRec(false); }, [selId]);

  const subjects = ["All", ...Array.from(new Set(MOCK.map(a => a.subject)))];
  const filtered = MOCK.filter(a => {
    const subOk = subject === "All" || a.subject === subject;
    const srchOk = !search || (a.topic + a.subject + a.grade).toLowerCase().includes(search.toLowerCase());
    return subOk && srchOk;
  });

  const asgn = selId ? MOCK.find(a => a.id === selId) ?? null : null;
  const q = asgn?.questions[curQ] ?? null;
  const total = asgn?.questions.length ?? 0;
  const qkey = asgn && q ? `${asgn.id}-${q.id}` : "";
  const qsub = !!subd[qkey];
  const qfb = fbk[qkey];
  const doneAll = asgn && asgn.questions.every(qq => subd[`${asgn.id}-${qq.id}`]);
  const totScore = asgn ? asgn.questions.reduce((s, qq) => s + (fbk[`${asgn.id}-${qq.id}`]?.score ?? 0), 0) : 0;
  const doneCount = asgn ? asgn.questions.filter(qq => subd[`${asgn.id}-${qq.id}`]).length : 0;
  const progPct = total ? Math.round(doneCount / total * 100) : 0;
  const wc = (txtA[q?.id ?? ""] || "").trim().split(/\s+/).filter(Boolean).length;
  const wcPct = q?.maxWords ? Math.min(100, (wc / q.maxWords) * 100) : 0;
  const wcState = wc === 0 ? "" : wc < (q?.minWords ?? 0) ? "warn" : "ok";
  const tc = q ? QT[q.type].accent : "#818cf8";

  const canSubmit = useCallback(() => {
    if (!q || qsub || busy) return false;
    if (q.type === "mcq") return mcqA[q.id] !== undefined;
    if (q.type === "speech") return !!tsc[q.id];
    if (q.type === "image" || q.type === "document") return !!uploads[q.id];
    return wc >= (q.minWords ?? 0);
  }, [q, qsub, busy, mcqA, tsc, wc, uploads]);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => { if (q) setTsc(p => ({ ...p, [q.id]: "Voice response recorded successfully." })); stream.getTracks().forEach(t => t.stop()); };
      mr.start(); mediaRef.current = mr; setRec(true);
    } catch { if (q) setTsc(p => ({ ...p, [q.id]: "[Microphone unavailable — answer noted]" })); }
  };
  const stopRec = () => { mediaRef.current?.stop(); setRec(false); };

  const handleFile = (file, qid, type) => {
    const url = URL.createObjectURL(file);
    const size = file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;
    setUploads(p => ({ ...p, [qid]: { name: file.name, type, url, size } }));
  };

  const submitQ = async () => {
    if (!q || !asgn) return;
    setBusy(true);
    await new Promise(r => setTimeout(r, 900));
    let score = 0, verdict = "wrong", comment = "";
    if (q.type === "mcq") { const ok = mcqA[q.id] === q.correctOption; score = ok ? q.marks : 0; verdict = ok ? "correct" : "wrong"; comment = ok ? "Correct! Well done." : `Correct answer: ${q.options?.[q.correctOption ?? 0]}.`; }
    else if (q.type === "speech") { score = Math.round(q.marks * .8); verdict = "partial"; comment = "Good attempt! Review key terms for a stronger response."; }
    else if (q.type === "image" || q.type === "document") { score = Math.round(q.marks * .85); verdict = "partial"; comment = "Upload received! Your teacher will review and grade this."; }
    else { const ratio = Math.min(1, wc / (q.maxWords ?? 200)); const comp = Math.random() * .35 + .55; score = Math.min(q.marks, Math.max(0, Math.round(q.marks * ratio * comp * 1.3))); verdict = score >= q.marks * .8 ? "correct" : score >= q.marks * .4 ? "partial" : "wrong"; comment = verdict === "correct" ? "Excellent! You covered all key points clearly." : verdict === "partial" ? "Good attempt. Expand on key concepts and add more examples." : "Needs more depth. Review the topic and focus on core concepts."; }
    setFbk(p => ({ ...p, [qkey]: { verdict, score, comment } }));
    setSubd(p => ({ ...p, [qkey]: true }));
    setBusy(false);
  };

  const goToAssign = (id) => { setSelId(id); setPage(2); };
  const goBack = () => setPage(1);

  // Upload Zone component
  const UploadZone = ({ qid, type }) => {
    const uploaded = uploads[qid];
    const fileRef = useRef(null);
    const accept = type === "image" ? "image/*" : "image/*,application/pdf,.doc,.docx";
    if (uploaded) return (
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div className="hw-upload-preview">
          {uploaded.type === "image" && uploaded.url ? <img src={uploaded.url} alt="upload"/> :
            <div className="hw-upload-doc"><span style={{ fontSize:28 }}>📄</span><span style={{ flex:1, fontSize:13, fontWeight:600, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{uploaded.name}</span></div>}
          {!qsub && <div className="hw-upload-info"><span className="hw-upload-name">{uploaded.name}</span><span className="hw-upload-sz">{uploaded.size}</span><button className="hw-upload-rm" onClick={() => setUploads(p => { const n = { ...p }; delete n[qid]; return n; })}>✕</button></div>}
        </div>
        {qsub && <div style={{ fontSize:12, color:"#059669", fontWeight:700, textAlign:"center" }}>✅ Uploaded — pending teacher review</div>}
      </div>
    );
    return (
      <div>
        <div className={`hw-dropzone${dragging === qid ? " drag" : ""}`}
          onDragOver={e => { e.preventDefault(); setDragging(qid); }}
          onDragLeave={() => setDragging(null)}
          onDrop={e => { e.preventDefault(); setDragging(null); const f = e.dataTransfer.files[0]; if (f) handleFile(f, qid, type); }}
          onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept={accept} style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f, qid, type); e.target.value = ""; }}/>
          <span className="hw-dz-icon">{type === "image" ? "🖼️" : "📎"}</span>
          <div className="hw-dz-title">Drop {type === "image" ? "image" : "document"} here</div>
          <div className="hw-dz-sub">or click to browse</div>
        </div>
        <div className="hw-accepted">{type === "image" ? "Accepted: JPG, PNG, GIF, WebP" : "Accepted: PDF, DOC, DOCX, JPG, PNG"}</div>
      </div>
    );
  };

  const total_n = MOCK.length, pending_n = MOCK.filter(a => a.status === "pending").length, done_n = MOCK.filter(a => a.status === "submitted" || a.status === "graded").length;
  const scoredMock = MOCK.filter(a => a.score !== undefined);
  const avg_score = scoredMock.length ? Math.round(scoredMock.reduce((s, a) => s + (a.score / a.totalMarks * 100), 0) / scoredMock.length) : 0;

  const SYLLABUS = [
    { name:"Mathematics", pct:65, emoji:"🧮", cls:"math", color:"#6366f1", chapters:"7/10" },
    { name:"Biology",     pct:42, emoji:"🌿", cls:"bio",  color:"#10b981", chapters:"5/12" },
    { name:"History",     pct:80, emoji:"🌍", cls:"hist", color:"#8b5cf6", chapters:"8/10" },
    { name:"Physics",     pct:28, emoji:"⚡", cls:"phys", color:"#ec4899", chapters:"3/11" },
    { name:"Comp. Sci.",  pct:55, emoji:"💻", cls:"cs",   color:"#0ea5e9", chapters:"6/11" },
  ];
  const ACHS = [
    { id:1, emoji:"⭐", title:"Perfect Score",  desc:"Math Quiz · 100%",   ai:"y", c:"yellow" },
    { id:2, emoji:"🔥", title:"Streak Master",  desc:"7 days in a row",    ai:"g", c:"green"  },
    { id:3, emoji:"🎓", title:"Chapter Master", desc:"Biology Ch.3 done",  ai:"p", c:"purple" },
    { id:4, emoji:"🚀", title:"Fast Learner",   desc:"Record completion",  ai:"b", c:"blue"   },
    { id:5, emoji:"💯", title:"Full Marks",     desc:"CS · 17/20",         ai:"y", c:"yellow" },
    { id:6, emoji:"📚", title:"Study Champ",    desc:"10h this week",      ai:"g", c:"green"  },
  ];

  const pendingList = filtered.filter(a => a.status === "pending" || a.status === "in-progress");
  const doneList = filtered.filter(a => a.status === "submitted" || a.status === "graded");

  const AssignCard = ({ a }) => {
    const sm = SUBJECT_META[a.subject] ?? { color:"#64748b", bg:"rgba(100,116,139,.12)" };
    const btnLabel = a.status === "submitted" ? "Review" : a.status === "graded" ? "View Result" : a.status === "in-progress" ? "Continue →" : "Start →";
    const btnCls = a.status === "submitted" ? "sub" : a.status === "graded" ? "grad" : "";
    return (
      <div className="hw-acard" style={{ "--c1":a.color[0], "--c2":a.color[1] }} onClick={() => goToAssign(a.id)}>
        <div className="hw-acard-banner"/>
        <div className="hw-acard-inner">
          <div className="hw-acard-top">
            <span className="hw-acard-emoji">{a.emoji}</span>
            <div className="hw-acard-info">
              <div className="hw-acard-topic">{a.topic}</div>
              <span className="hw-acard-subj" style={{ background:sm.bg, color:sm.color }}>{a.subject}</span>
              <div className="hw-acard-grade">{a.grade}</div>
            </div>
          </div>
          <div className="hw-acard-desc">{a.description}</div>
          <div className="hw-acard-tags">
            <span className="hw-atag">⏱ {a.timeLimit}m</span>
            <span className="hw-atag">🏆 {a.totalMarks}pts</span>
            <span className="hw-atag">📅 {a.dueDate}</span>
            <span className="hw-atag">{a.questions.length} Qs</span>
            <span className={`hw-astatus ${a.status}`}>{a.status}</span>
          </div>
          {a.status === "in-progress" && <div><div className="hw-mini-prog-bg"><div className="hw-mini-prog-fill" style={{ width:"45%", background:`linear-gradient(90deg,${a.color[0]},${a.color[1]})` }}/></div><div className="hw-mini-prog-lbl">45% complete</div></div>}
          {a.score !== undefined && <div><div className="hw-mini-prog-bg"><div className="hw-mini-prog-fill" style={{ width:`${Math.round(a.score/a.totalMarks*100)}%`, background:"linear-gradient(90deg,#10b981,#0ea5e9)" }}/></div><div className="hw-mini-prog-lbl" style={{ color:"#059669" }}>Score: {a.score}/{a.totalMarks} ({Math.round(a.score/a.totalMarks*100)}%)</div></div>}
        </div>
        <div className="hw-acard-foot">
          <div className="hw-acard-meta-lbl">{a.aiGenerated ? "🤖 AI Generated" : "👨‍🏫 Teacher Set"}</div>
          <button className={`hw-acard-btn ${btnCls}`} onClick={e => { e.stopPropagation(); goToAssign(a.id); }}>{btnLabel}</button>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="hw-ambient"/>
      <div className={`hw-root${dark ? " dark" : ""}`}>

        {/* TOPBAR */}
        <Navigation currentRole={user?.role as "student" | "teacher" || "student"} onRoleChange={() => {}} />
        <div className="hw-topbar">
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div className="hw-logo-icon">📚</div>
            <span className="hw-logo-text">StudyAI</span>
          </div>
          <div className="hw-topbar-sep"/>
          <div className="hw-breadcrumb">
            {page === 2
              ? <><span className="hw-bc-link" onClick={goBack}>Homework Hub</span><span>›</span><span className="hw-bc-active">{asgn?.topic}</span></>
              : <span style={{ color:"var(--text)", fontWeight:700 }}>Homework Hub</span>}
          </div>
          <div className="hw-topbar-right">
            <span className="hw-topbar-pill">✨ AI Engine</span>
            <button className="hw-theme-btn" onClick={() => setDark(d => !d)} title="Toggle theme">{dark ? "☀️" : "🌙"}</button>
          </div>
        </div>

        {/* MOBILE TABS (page 1) */}
        {page === 1 && (
          <div className="hw-mobtabs">
            <div className="hw-mobtab-inner">
              <button className="hw-mobtab active">📋 Assignments</button>
              <button className="hw-mobtab" onClick={() => filtered[0] && goToAssign(filtered[0].id)}>✏️ Start Solving</button>
            </div>
          </div>
        )}

        {/* PAGE 1 */}
        {page === 1 && (
          <div>
            {/* Hero */}
            <div className="hw-hero" style={{ animation:"heroIn .55s cubic-bezier(.34,1.56,.64,1) both" }}>
              <div className="hw-hero-in">
                <div className="hw-hero-left">
                  <div className="hw-hero-avatar">📚</div>
                  <div>
                    <div className="hw-hero-pill">🎓 My Homework Hub</div>
                    <div className="hw-hero-title">Welcome back, Student! 👋</div>
                    <div className="hw-hero-sub">AI-powered assignments · {pending_n} pending · Keep up the great work!</div>
                  </div>
                </div>
                <div className="hw-hero-right">
                  {[{ n:total_n, l:"Total" }, { n:pending_n, l:"Pending ⏳" }, { n:done_n, l:"Done ✅" }, { n:avg_score+"%", l:"Avg Score" }].map((s, i) => (
                    <div className="hw-hstat" key={i}><div className="hw-hstat-n">{s.n}</div><div className="hw-hstat-l">{s.l}</div></div>
                  ))}
                  <button className="hw-hero-btn" onClick={() => { const a = filtered.find(a => a.status === "pending"); if (a) goToAssign(a.id); }}>Start Solving →</button>
                </div>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="hw-stats">
              {[
                { label:"Total",     value:total_n,   cls:"blue",   icon:"📚", sub:"Across all subjects",    suffix:"" },
                { label:"Pending",   value:pending_n, cls:"amber",  icon:"⏳", sub:"Complete before deadline", suffix:"" },
                { label:"Completed", value:done_n,    cls:"green",  icon:"✅", sub:"Submitted & graded",     suffix:"" },
                { label:"Avg Score", value:avg_score, cls:"purple", icon:"🏆", sub:"Keep improving!",        suffix:"%" },
              ].map((s, i) => (
                <div key={i} className={`hw-scard ${s.cls}`} style={{ animationDelay:`${.05+i*.07}s` }}>
                  <div className="hw-scard-icon">{s.icon}</div>
                  <div className="hw-scard-n"><AnimNum target={s.value} suffix={s.suffix}/></div>
                  <div className="hw-scard-l">{s.label}</div>
                  <div className="hw-scard-sub">{s.sub}</div>
                </div>
              ))}
            </div>

            <div className="hw-body">
              {/* Syllabus */}
              <div className="hw-panel" style={{ marginBottom:16 }}>
                <div className="hw-panel-head">
                  <div><div className="hw-panel-title">📋 Syllabus Progress</div><div className="hw-panel-sub">Curriculum coverage across subjects</div></div>
                </div>
                <div className="hw-panel-body">
                  <div className="hw-syl-grid">
                    {SYLLABUS.map((s, i) => {
                      const r = 25, circ = 2 * Math.PI * r, offset = circ - (s.pct / 100) * circ;
                      return (
                        <div key={i} className={`hw-syl-card ${s.cls}`}>
                          <span className="hw-syl-emoji">{s.emoji}</span>
                          <div className="hw-syl-name">{s.name}</div>
                          <div className="hw-syl-ring-wrap">
                            <svg viewBox="0 0 60 60">
                              <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(0,0,0,.07)" strokeWidth="5"/>
                              <circle cx="30" cy="30" r={r} fill="none" stroke={s.color} strokeWidth="5" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition:"stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)" }}/>
                            </svg>
                            <div className="hw-syl-ring-label" style={{ color:s.color }}>{s.pct}%</div>
                          </div>
                          <div className="hw-syl-sub">{s.chapters} chapters</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Search + Filter */}
              <div className="hw-filter-row">
                <div className="hw-search-wrap"><span className="hw-search-ico">🔍</span><input className="hw-search" placeholder="Search assignments…" value={search} onChange={e => setSearch(e.target.value)}/></div>
                {subjects.map(s => <button key={s} className={`hw-fchip${subject === s ? " on" : ""}`} onClick={() => setSubject(s)}>{s}</button>)}
              </div>

              {/* Pending */}
              {pendingList.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div className="hw-sec-title">⏳ Pending Assignments ({pendingList.length})</div>
                  <div className="hw-ag">{pendingList.map(a => <AssignCard key={a.id} a={a}/>)}</div>
                </div>
              )}

              {/* Completed */}
              {doneList.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div className="hw-sec-title">✅ Completed ({doneList.length})</div>
                  <div className="hw-ag">{doneList.map(a => <AssignCard key={a.id} a={a}/>)}</div>
                </div>
              )}

              {filtered.length === 0 && (
                <div style={{ textAlign:"center", padding:"60px 20px", color:"var(--muted)" }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
                  <div style={{ fontSize:16, fontWeight:700, color:"var(--text)", marginBottom:6 }}>No assignments found</div>
                  <div style={{ fontSize:13 }}>Try a different search term or subject filter.</div>
                </div>
              )}

              {/* Achievements */}
              <div className="hw-panel">
                <div className="hw-panel-head">
                  <div className="hw-panel-title">🏆 Recent Achievements</div>
                  <button className="hw-view-all">View all →</button>
                </div>
                <div className="hw-panel-body">
                  <div className="hw-ach-row">
                    {ACHS.map((a, i) => (
                      <div key={a.id} className={`hw-ach-item ${a.c}`}>
                        <div className={`hw-ach-icon ${a.ai}`}>{a.emoji}</div>
                        <div className="hw-ach-name">{a.title}</div>
                        <div className="hw-ach-desc">{a.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 2 */}
        {page === 2 && asgn && (
          <div>
            {/* P2 Hero */}
            <div className="hw-p2hero" style={{ "--c1":asgn.color[0], "--c2":asgn.color[1] }}>
              <div className="hw-p2hero-in">
                <button className="hw-p2-back" onClick={goBack}>←</button>
                <span className="hw-p2hero-emoji">{asgn.emoji}</span>
                <div className="hw-p2hero-body">
                  <div className="hw-p2hero-badge">{asgn.aiGenerated ? "✨ AI Generated" : "👨‍🏫 Teacher Set"} · {asgn.triggeredBy === "auto" ? "Auto-assigned" : "Manually set"}</div>
                  <div className="hw-p2hero-title">{asgn.topic}</div>
                  <div className="hw-p2hero-meta">
                    <span className="hw-p2hero-mi">📚 {asgn.subject}</span>
                    <span className="hw-p2hero-mi">🎯 {asgn.grade}</span>
                    <span className="hw-p2hero-mi">⏱ {asgn.timeLimit} min</span>
                    <span className="hw-p2hero-mi">📅 Due {asgn.dueDate}</span>
                  </div>
                </div>
                <div className="hw-p2hero-right">
                  <Ring pct={progPct} size={52} stroke={5} color="rgba(255,255,255,.95)" bg="rgba(255,255,255,.2)">
                    <span style={{ fontSize:10, fontWeight:900, color:"#fff" }}>{progPct}%</span>
                  </Ring>
                  <div className="hw-p2-div"/>
                  <div className="hw-p2-sitem"><div className="hw-p2-sn">{totScore}</div><div className="hw-p2-sl">Score</div></div>
                  <div className="hw-p2-div"/>
                  <div className="hw-p2-sitem"><div className="hw-p2-sn">{asgn.totalMarks}</div><div className="hw-p2-sl">Total</div></div>
                  <div className="hw-p2-div"/>
                  <div className="hw-p2-sitem"><div className="hw-p2-sn">{doneCount}/{total}</div><div className="hw-p2-sl">Done</div></div>
                </div>
              </div>
            </div>

            <div className="hw-p2body">
              {/* Q Index */}
              <div className="hw-p2left">
                <div className="hw-qidx">
                  <div className="hw-qidx-head">Questions ({total})</div>
                  <div className="hw-qidx-list">
                    {asgn.questions.map((qq, i) => {
                      const done = subd[`${asgn.id}-${qq.id}`], cur = i === curQ, cfg = QT[qq.type];
                      return (
                        <button key={i} className={`hw-qi-btn${cur ? " cur" : ""}${done ? " done" : ""}`} onClick={() => setCurQ(i)}>
                          <div className="hw-qi-dot">{done ? "✓" : cfg.icon}</div>
                          <div className="hw-qi-info">
                            <div className="hw-qi-label">Q{i+1} · {cfg.short}</div>
                            <div className="hw-qi-meta">{qq.marks} mark{qq.marks > 1 ? "s" : ""}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Q Card */}
              <div className="hw-p2right">
                {!doneAll && q ? (
                  <div key={`q-${asgn.id}-${curQ}`} className="hw-qcard" style={{ "--tc":tc }}>
                    <div className="hw-qcard-accent"/>
                    <div className="hw-qcard-head">
                      <div className="hw-qcard-icon-box" style={{ background:`${tc}20` }}>{QT[q.type].icon}</div>
                      <div>
                        <div className="hw-qcard-type">{QT[q.type].label}</div>
                        <div className="hw-qcard-num">Question {curQ+1} of {total}</div>
                      </div>
                      <div className="hw-qcard-marks">🏅 {q.marks} mark{q.marks > 1 ? "s" : ""}</div>
                    </div>

                    <div className="hw-qcard-body">
                      <div className="hw-qtext" onCopy={e => e.preventDefault()} onContextMenu={e => e.preventDefault()}>{q.question}</div>
                      {q.hint && !qsub && <div className="hw-hint"><span style={{ fontSize:16, flexShrink:0 }}>💡</span><span className="hw-hint-t">{q.hint}</span></div>}

                      {/* MCQ */}
                      {q.type === "mcq" && (
                        <div className="hw-opts">
                          {q.options?.map((opt, i) => {
                            const sel = mcqA[q.id] === i, co = qsub && i === q.correctOption, wr = qsub && sel && i !== q.correctOption;
                            return (
                              <div key={i} className={`hw-opt${sel && !qsub ? " sel" : ""}${co ? " correct" : ""}${wr ? " wrong" : ""}`}
                                onClick={() => !qsub && setMcqA(p => ({ ...p, [q.id]:i }))}
                                onContextMenu={e => e.preventDefault()}>
                                <div className="hw-opt-ltr">{String.fromCharCode(65+i)}</div>
                                <span style={{ flex:1 }}>{opt}</span>
                                {co && <span style={{ color:"#10b981", flexShrink:0, fontSize:16 }}>✓</span>}
                                {wr && <span style={{ color:"var(--danger)", flexShrink:0, fontSize:16 }}>✗</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Text */}
                      {(q.type === "short" || q.type === "medium" || q.type === "long") && (
                        <div>
                          {!qsub && <div className="hw-type-notice"><span className="hw-nb">✏️ Type only</span> Paste disabled — write in your own words</div>}
                          <textarea className="hw-ta"
                            placeholder={`Write your answer here… (${q.minWords}–${q.maxWords} words)`}
                            value={txtA[q.id] || ""} readOnly={qsub}
                            onChange={e => !qsub && setTxtA(p => ({ ...p, [q.id]:e.target.value }))}
                            onPaste={e => { e.preventDefault(); setPwarn(true); setTimeout(() => setPwarn(false), 2600); }}
                            rows={q.type === "long" ? 11 : q.type === "medium" ? 7 : 4}
                            style={qsub ? { opacity:.52, cursor:"default" } : {}}/>
                          {pwarn && <div className="hw-pwarn">🚫 Paste not allowed — please type your answer.</div>}
                          <div className="hw-wc">
                            <span className={`hw-wc-n${wcState ? " "+wcState : ""}`}>{wc} words</span>
                            <div className="hw-wc-track"><div className="hw-wc-fill" style={{ width:`${wcPct}%`, background:wcState==="ok"?"#10b981":wcState==="warn"?"#f59e0b":"var(--border2)" }}/></div>
                            <span className="hw-wc-n">{q.minWords}–{q.maxWords}</span>
                          </div>
                        </div>
                      )}

                      {q.type === "image" && <UploadZone qid={q.id} type="image"/>}
                      {q.type === "document" && <UploadZone qid={q.id} type="document"/>}

                      {q.type === "speech" && (
                        <div className="hw-speech">
                          <div className="hw-mic-wrap">
                            {rec && <><div className="hw-mic-ring"/><div className="hw-mic-ring2"/></>}
                            <button className={`hw-mic${rec ? " rec" : ""}`} onClick={rec ? stopRec : startRec} disabled={qsub}>{rec ? "🎙️" : "🎤"}</button>
                          </div>
                          <p style={{ fontSize:12.5, color:"var(--muted)", fontWeight:600 }}>
                            {rec ? "🔴 Recording — tap to stop" : qsub ? "✅ Response recorded" : "Tap the mic to start speaking"}
                          </p>
                          {tsc[q.id] && <div className="hw-transcript">"{tsc[q.id]}"</div>}
                        </div>
                      )}
                    </div>

                    {qfb && (
                      <div className={`hw-fb ${qfb.verdict}`}>
                        <div className="hw-fbh">
                          <span className="hw-fbv">{qfb.verdict==="correct"?"✅ Correct":qfb.verdict==="partial"?"🟡 Partial Credit":"❌ Incorrect"}</span>
                          <span className="hw-fbs">{qfb.score}/{q.marks}</span>
                        </div>
                        <div className="hw-fbc">{qfb.comment}</div>
                      </div>
                    )}

                    <div className="hw-actions">
                      <button className={`hw-btn-sub${qsub ? " done" : ""}`} onClick={submitQ} disabled={!canSubmit() || busy}>
                        {busy ? <><span className="spin">⟳</span> Evaluating…</> : qsub ? <>✓ Submitted</> : <>→ Submit Answer</>}
                      </button>
                      {curQ > 0 && <button className="hw-btn-nav" onClick={() => setCurQ(c => c-1)}>← Prev</button>}
                      {curQ < total-1 && <button className="hw-btn-nav" onClick={() => setCurQ(c => c+1)} style={{ marginLeft:"auto" }}>Next →</button>}
                      <button className="hw-btn-nav" onClick={goBack} style={{ marginLeft:curQ===total-1?"auto":undefined }}>📋 Hub</button>
                    </div>
                  </div>
                ) : doneAll ? (
                  <div className="hw-qcard">
                    <div className="hw-done">
                      <div className="hw-done-trophy">🏆</div>
                      <div className="hw-done-title">Assignment Complete!</div>
                      <div className="hw-done-score">{totScore}<small>/{asgn.totalMarks}</small></div>
                      <div className="hw-done-pct">{Math.round(totScore/asgn.totalMarks*100)}% · AI Engine logged your performance</div>
                      <div className="hw-done-bk">
                        {asgn.questions.map((qq, i) => {
                          const f = fbk[`${asgn.id}-${qq.id}`]; if (!f) return null;
                          const cfg = QT[qq.type];
                          const col = f.verdict==="correct" ? {bg:"rgba(16,185,129,.1)",c:"#059669"} : f.verdict==="partial" ? {bg:"rgba(245,158,11,.1)",c:"#d97706"} : {bg:"rgba(239,68,68,.08)",c:"var(--danger)"};
                          return (
                            <div key={qq.id} className="hw-done-row">
                              <span style={{ fontSize:14 }}>{cfg.icon}</span>
                              <span className="hw-done-l">Q{i+1} · {cfg.short}</span>
                              <span className="hw-done-s" style={{ background:col.bg, color:col.c }}>{f.score}/{qq.marks}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display:"flex", gap:10, marginTop:10, flexWrap:"wrap", justifyContent:"center" }}>
                        <button className="hw-btn-sub" onClick={() => { const n = MOCK.find(a => a.id !== asgn.id && a.status === "pending"); if (n) goToAssign(n.id); }}>Next Assignment →</button>
                        <button className="hw-btn-nav" onClick={goBack}>← Back to Hub</button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Chat Widget — always visible */}
      <AIChatWidget
        currentSubject={asgn?.subject ?? null}
        currentQuestion={q?.question?.slice(0, 50) + (q?.question?.length > 50 ? "…" : "") ?? null}
        dark={dark}
      />
    </>
  );
}