/**
 * HomeworkHelper.tsx
 * GradeUp — AI-powered homework assistant
 *
 * Changes from v1:
 *  - Sidebar: only "New Chat" button (top) + chat history list (bottom)
 *  - Modes & Subjects moved to header only
 *  - All AI answers use typing animation (character-by-character)
 *  - Small inline loaders added where appropriate
 *  - New Chat button pinned to top of sidebar
 *  - Chat history scrolls below
 */

import { useAuth } from "../hooks/use-auth";
import Navigation from "../components/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Download,
  FileText,
  GraduationCap,
  History,
  Lightbulb,
  Loader2,
  Menu,
  Mic,
  MicOff,
  Paperclip,
  PenLine,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
  Zap,
  CheckCircle,
  MessageSquare,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type Role = "user" | "assistant";
type SubjectKey = "general" | "math" | "science" | "english" | "history" | "coding";
type ModeKey = "guided" | "full" | "check";
type View = "chat" | "history";

interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  kind: "image" | "document" | "other";
  previewUrl?: string;
}

interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  attachments?: AttachmentItem[];
  animate?: boolean; // flag to trigger typing animation
}

interface ChatSession {
  id: string;
  title: string;
  subject: SubjectKey;
  mode: ModeKey;
  messages: Message[];
  updatedAt: string;
}

interface AppState {
  sessions: ChatSession[];
  activeId: string;
}

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────

const T = {
  bg: "#f0f3fb",
  panel: "#ffffff",
  panel2: "#f4f7fc",
  border: "#e1e7f2",
  text: "#0c1220",
  sub: "#576075",
  muted: "#9ba5bc",
  accent: "#4a5be8",
  accent2: "#7c3aed",
  accentSoft: "rgba(74,91,232,.1)",
  tutor: "#f59e0b",
  full: "#4a5be8",
  check: "#10b981",
  radius: "12px",
  radiusLg: "18px",
  shadow: "0 2px 12px rgba(0,0,0,.07)",
  shadowSm: "0 1px 4px rgba(0,0,0,.05)",
  shadowLg: "0 8px 32px rgba(0,0,0,.13)",
  font: "'Plus Jakarta Sans', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const;

// ─────────────────────────────────────────────────────────────
// SUBJECTS & MODES CONFIG
// ─────────────────────────────────────────────────────────────

const SUBJECTS: Record<
  SubjectKey,
  { label: string; color: string; bg: string; icon: ReactNode }
> = {
  general: { label: "General", color: "#4a5be8", bg: "rgba(74,91,232,.1)", icon: <Sparkles size={14} /> },
  math: { label: "Math", color: "#0ea5e9", bg: "rgba(14,165,233,.12)", icon: <Brain size={14} /> },
  science: { label: "Science", color: "#10b981", bg: "rgba(16,185,129,.12)", icon: <Search size={14} /> },
  english: { label: "English", color: "#8b5cf6", bg: "rgba(139,92,246,.12)", icon: <PenLine size={14} /> },
  history: { label: "History", color: "#f59e0b", bg: "rgba(245,158,11,.15)", icon: <BookOpen size={14} /> },
  coding: { label: "Coding", color: "#ef4444", bg: "rgba(239,68,68,.12)", icon: <FileText size={14} /> },
};

const MODES: Record<
  ModeKey,
  { label: string; short: string; desc: string; icon: ReactNode; color: string }
> = {
  guided: {
    label: "Tutor Mode",
    short: "Tutor",
    desc: "Hints & guided discovery — learn the method",
    icon: <Lightbulb size={15} />,
    color: "#f59e0b",
  },
  full: {
    label: "Full Answer",
    short: "Answer",
    desc: "Complete solution with step-by-step explanation",
    icon: <Zap size={15} />,
    color: "#4a5be8",
  },
  check: {
    label: "Check Work",
    short: "Check",
    desc: "Review your work, find errors, give feedback",
    icon: <CheckCircle size={15} />,
    color: "#10b981",
  },
};

const STARTERS: Record<SubjectKey, string[]> = {
  general: ["Explain this concept", "Help me understand", "Make a study plan"],
  math: ["Solve step by step", "Explain the formula", "Check my working"],
  science: ["Explain the concept", "Summarize the chapter", "Analyse this idea"],
  english: ["Draft an essay outline", "Analyse this poem", "Improve my writing"],
  history: ["Build a timeline", "Explain the causes", "Create revision notes"],
  coding: ["Debug my code", "Explain this error", "Write pseudocode"],
};

const SYSTEM_PROMPTS: Record<ModeKey, (subject: string) => string> = {
  guided: (subject) => `You are GradeUp, a brilliant and friendly academic tutor. The student is in TUTOR MODE.

DO NOT give the full answer directly. Instead use the Socratic method:
- Ask guiding questions that lead the student to think
- Give hints step by step, one at a time
- Help them discover the answer themselves
- Celebrate small wins and encourage thinking
- Only reveal the next step after prompting thought
- Use ✓ checkmarks for confirmed understanding, numbered hints

Subject: ${subject}

Keep responses concise but engaging. End with a question that moves them forward.`,

  full: (subject) => `You are GradeUp, an expert academic assistant. The student wants a FULL ANSWER.

Provide a complete, thorough explanation:
- Restate the problem clearly
- Show every step with numbered explanations
- Use formulas, worked examples, and analogies where helpful
- Add diagrams in text form if useful
- Close with a clear summary and key takeaways
- Use ## headings, numbered steps, \`code blocks\`, and **bold** for key terms

Subject: ${subject}`,

  check: (subject) => `You are GradeUp, an expert academic reviewer. The student wants you to CHECK THEIR WORK.

Your job:
- Carefully read what the student submitted
- Identify errors, misconceptions, or incomplete steps (mark with ✗)
- Identify correct parts (mark with ✓)
- Explain WHY each error is wrong and how to fix it
- Provide the correct approach or solution
- Give an overall score (e.g. 8/10) with specific, encouraging feedback
- Be honest but kind

Subject: ${subject}`,
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const uid = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const fmtBytes = (b: number): string =>
  b < 1024 ? `${b}B` : b < 1048576 ? `${(b / 1024).toFixed(1)}KB` : `${(b / 1048576).toFixed(1)}MB`;

const relTime = (iso: string): string => {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000) return "just now";
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
};

const mkSession = (): ChatSession => ({
  id: uid(),
  title: "New chat",
  subject: "general",
  mode: "guided",
  messages: [],
  updatedAt: new Date().toISOString(),
});

const STORAGE_KEY = "gradeup-v3";

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.sessions?.length) throw new Error("no sessions");
    // Strip animate flags on load
    parsed.sessions = parsed.sessions.map((s) => ({
      ...s,
      messages: s.messages.map((m) => ({ ...m, animate: false })),
    }));
    return parsed;
  } catch {
    const s = mkSession();
    return { sessions: [s], activeId: s.id };
  }
}

function saveState(state: AppState): void {
  try {
    // Don't persist animate flag
    const clean: AppState = {
      ...state,
      sessions: state.sessions.map((s) => ({
        ...s,
        messages: s.messages.map((m) => ({ ...m, animate: false })),
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch { /* storage full */ }
}

// Minimal markdown → HTML
function mdToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _lang, code) =>
      `<pre style="background:${T.panel2};border:1px solid ${T.border};border-radius:8px;padding:10px 12px;overflow-x:auto;margin:8px 0;font-family:${T.mono};font-size:12.5px">${code.trim()}</pre>`
    )
    .replace(/`([^`]+)`/g, `<code style="font-family:${T.mono};font-size:12.5px;background:${T.panel2};padding:1px 5px;border-radius:4px">$1</code>`)
    .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;margin:10px 0 4px">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:15px;font-weight:700;margin:12px 0 4px">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:17px;font-weight:800;margin:12px 0 5px">$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^---$/gm, `<hr style="border:none;border-top:1px solid ${T.border};margin:10px 0">`)
    .replace(/^\d+\. (.+)$/gm, "<li style='margin:3px 0'>$1</li>")
    .replace(/^[•\-\*] (.+)$/gm, "<li style='margin:3px 0'>$1</li>")
    .replace(/(<li[\s\S]+?<\/li>)/g, `<ul style="padding-left:18px;margin:6px 0">$1</ul>`)
    .replace(/<\/ul>\s*<ul[^>]*>/g, "")
    .replace(/\n\n+/g, "</p><p style='margin:5px 0'>")
    .replace(/\n/g, "<br>")
    .replace(/^([^<])/, "<p style='margin:5px 0'>$1")
    .replace(/([^>])$/, "$1</p>");
}

// ─────────────────────────────────────────────────────────────
// GLOBAL CSS
// ─────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }

::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-thumb { background: #e1e7f2; border-radius: 4px; }
::-webkit-scrollbar-track { background: transparent; }

@keyframes gu-spin   { to { transform: rotate(360deg); } }
@keyframes gu-blink  { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes gu-dot    { 0%,80%,100%{transform:scale(.6);opacity:.4} 40%{transform:scale(1);opacity:1} }
@keyframes gu-msgin  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
@keyframes gu-fadein { from{opacity:0} to{opacity:1} }
@keyframes gu-pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }

.gu-spin    { animation: gu-spin 1s linear infinite; }
.gu-msgin   { animation: gu-msgin .22s ease; }
.gu-fadein  { animation: gu-fadein .2s ease; }

.gu-cursor  {
  display: inline-block; width: 2px; height: .88em;
  background: #4a5be8; vertical-align: middle; margin-left: 2px;
  border-radius: 1px; animation: gu-blink .7s step-end infinite;
}

.gu-dots { display: flex; gap: 4px; align-items: center; }
.gu-dots span {
  width: 7px; height: 7px; border-radius: 50%;
  background: #4a5be8; animation: gu-dot .9s ease infinite;
}
.gu-dots span:nth-child(2) { animation-delay: .18s; }
.gu-dots span:nth-child(3) { animation-delay: .36s; }

.gu-scrim {
  position: fixed; inset: 0; background: rgba(12,18,32,.38);
  z-index: 39; animation: gu-fadein .2s ease;
}

.gu-prose { white-space: normal; word-break: break-word; overflow-wrap: anywhere; }
.gu-prose p { margin: 5px 0; line-height: 1.75; }
.gu-prose ul, .gu-prose ol { padding-left: 20px; margin: 6px 0; }
.gu-prose li { margin: 3px 0; line-height: 1.65; }

.gu-hbtn:hover { opacity: .8; }
.gu-ghost:hover { background: #f4f7fc; color: #0c1220; }
.gu-hist:hover { background: #f4f7fc; }
.gu-hist.active { background: rgba(74,91,232,.1); color: #4a5be8; }

.gu-send-btn:not(:disabled):hover { filter: brightness(1.08); transform: scale(1.03); }
.gu-send-btn { transition: all .15s; }

@media (max-width: 639px) {
  .hide-mobile { display: none !important; }
}
@media (max-width: 959px) {
  .hide-tablet { display: none !important; }
}
`;

function useGlobalStyle(): void {
  useEffect(() => {
    const id = "gu-global";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = GLOBAL_CSS;
      document.head.appendChild(el);
    }
  }, []);
}

// ─────────────────────────────────────────────────────────────
// BREAKPOINT HOOK
// ─────────────────────────────────────────────────────────────

function useBreakpoint() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return { mobile: w < 640, tablet: w >= 640 && w < 960, desktop: w >= 960, wide: w >= 1400, w };
}

// ─────────────────────────────────────────────────────────────
// TYPING ANIMATION HOOK
// ─────────────────────────────────────────────────────────────

function useTypingAnimation(
  target: string,
  shouldAnimate: boolean,
  speed = 12
): { displayed: string; done: boolean } {
  const [displayed, setDisplayed] = useState(shouldAnimate ? "" : target);
  const [done, setDone] = useState(!shouldAnimate);

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplayed(target);
      setDone(true);
      return;
    }
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i += speed;
      if (i >= target.length) {
        setDisplayed(target);
        setDone(true);
        clearInterval(interval);
      } else {
        setDisplayed(target.slice(0, i));
      }
    }, 16);
    return () => clearInterval(interval);
  }, [target, shouldAnimate, speed]);

  return { displayed, done };
}

// ─────────────────────────────────────────────────────────────
// ANTHROPIC API
// ─────────────────────────────────────────────────────────────

async function callAnthropicAPI(
  messages: { role: Role; content: string }[],
  systemPrompt: string
): Promise<string> {
  const apiKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY as string | undefined;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-api-key": apiKey, "anthropic-version": "2023-06-01" } : {}),
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.slice(-12),
    }),
  });

  if (!response.ok) throw new Error(`API ${response.status}`);

  const data = await response.json();
  const text =
    data.content
      ?.filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("") ?? "";

  return text.trim() || "I couldn't generate a response. Please try again.";
}

const FALLBACKS: Record<ModeKey, string> = {
  guided: `Great question! Let me guide you through this step by step. 🎯

**Hint 1:** Before we dive in, what do you already know about this topic?

Think about:
- What information is given to you?
- What are you trying to find out?
- Have you seen a similar problem before?

Take a moment and share your initial thoughts — I'll give you the next hint based on where you are! 💡`,

  full: `Here's a complete breakdown:

## Understanding the Problem

Let me walk you through this systematically.

**Step 1 — Identify what's given**
Start by listing all the information provided.

**Step 2 — Determine what we need**
What exactly is being asked?

**Step 3 — Apply the relevant concept**
Choose the right formula/method.

**Step 4 — Solve**
Work through the calculation carefully.

**Step 5 — Verify**
Check your answer makes sense.

> 💡 **Tip:** Connect your API key in the environment variables to get personalised, detailed answers!`,

  check: `## Work Review

Here's how I'd assess your submission:

**✓ What looks good:**
- Your approach shows understanding of the core concept
- Your structure is logical

**✗ Areas to review:**
- Double-check your calculations at each step
- Make sure you've answered exactly what was asked

**Overall: 7/10** — Solid start! A few refinements and this will be excellent.

> 💡 Connect your API key to get detailed, personalised feedback on your specific work!`,
};

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

// ── File Chip ──────────────────────────────────────────────

interface FileChipProps {
  file: AttachmentItem;
  removable?: boolean;
  onRemove?: () => void;
  dark?: boolean;
}

function FileChip({ file, removable, onRemove, dark }: FileChipProps) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "5px 8px", borderRadius: 9,
        border: `1px solid ${dark ? "rgba(255,255,255,.22)" : T.border}`,
        background: dark ? "rgba(255,255,255,.12)" : T.panel2,
        maxWidth: 220, color: dark ? "#fff" : T.text,
        flexShrink: 0, fontFamily: T.font,
      }}
    >
      {file.kind === "image" && file.previewUrl ? (
        <img src={file.previewUrl} alt={file.name}
          style={{ width: 28, height: 28, borderRadius: 5, objectFit: "cover" }} />
      ) : (
        <span style={{
          width: 28, height: 28, borderRadius: 5,
          background: T.accentSoft, color: T.accent,
          display: "grid", placeItems: "center", flexShrink: 0,
        }}>
          <FileText size={12} />
        </span>
      )}
      <span style={{ minWidth: 0, display: "flex", flexDirection: "column", flex: 1 }}>
        <b style={{ fontSize: 11, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130, display: "block" }}>
          {file.name}
        </b>
        <small style={{ fontSize: 10, opacity: 0.7 }}>{fmtBytes(file.size)}</small>
      </span>
      {removable && (
        <button onClick={onRemove}
          style={{ width: 18, height: 18, borderRadius: 4, border: "none", background: "transparent", color: dark ? "rgba(255,255,255,.6)" : T.muted, cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <X size={10} />
        </button>
      )}
    </div>
  );
}

// ── AI Avatar ─────────────────────────────────────────────

function AvatarAI() {
  return (
    <div style={{
      width: 32, height: 32,
      borderRadius: "9px 9px 9px 2px",
      background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
      display: "grid", placeItems: "center",
      color: "#fff", flexShrink: 0,
    }}>
      <GraduationCap size={15} />
    </div>
  );
}

// ── Action Button ────────────────────────────────────────

function ActionButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      height: 26, padding: "0 9px", borderRadius: 7,
      border: `1px solid ${T.border}`, background: T.panel2,
      color: T.sub, font: `600 11px ${T.font}`, cursor: "pointer",
    }}>
      {children}
    </button>
  );
}

// ── AI Bubble ─────────────────────────────────────────────

interface AIBubbleProps {
  msg: Message;
  copiedId: string | null;
  onCopy: (id: string) => void;
  onRegen: () => void;
}

function AIBubble({ msg, copiedId, onCopy, onRegen }: AIBubbleProps) {
  const shouldAnimate = !!msg.animate;
  const { displayed, done } = useTypingAnimation(msg.content, shouldAnimate);

  const renderedText = displayed;
  const showActions = !shouldAnimate || done;

  return (
    <article className="gu-msgin"
      style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "flex-start" }}>
      <AvatarAI />
      <div style={{
        background: T.panel, border: `1px solid ${T.border}`,
        borderRadius: "4px 16px 16px 16px", padding: "12px 15px",
        boxShadow: T.shadowSm, fontSize: 13.5, lineHeight: 1.75,
        color: T.text, fontFamily: T.font,
        display: "flex", flexDirection: "column", gap: 2,
        maxWidth: "min(760px, 82%)",
      }}>
        <div className="gu-prose" dangerouslySetInnerHTML={{ __html: mdToHtml(renderedText) }} />
        {shouldAnimate && !done && <span className="gu-cursor" />}
        {showActions && (
          <div style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" }}>
            <ActionButton onClick={() => onCopy(msg.id)}>
              {copiedId === msg.id ? <><Check size={11} /> Copied</> : <><Clipboard size={11} /> Copy</>}
            </ActionButton>
            <ActionButton onClick={onRegen}>
              <RefreshCw size={11} /> Regenerate
            </ActionButton>
          </div>
        )}
      </div>
    </article>
  );
}

// ── Loading Bubble ────────────────────────────────────────

function LoadingBubble() {
  return (
    <article className="gu-msgin"
      style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "flex-start" }}>
      <AvatarAI />
      <div style={{
        background: T.panel, border: `1px solid ${T.border}`,
        borderRadius: "4px 16px 16px 16px", padding: "14px 18px",
        boxShadow: T.shadowSm, display: "flex", alignItems: "center", gap: 12,
      }}>
        <div className="gu-dots"><span /><span /><span /></div>
        <span style={{ fontSize: 13, color: T.sub }}>Thinking…</span>
      </div>
    </article>
  );
}

// ── History View ──────────────────────────────────────────

interface HistoryViewProps {
  sessions: ChatSession[];
  activeId: string;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onBack: () => void;
  bp: ReturnType<typeof useBreakpoint>;
}

function HistoryView({ sessions, activeId, onOpen, onDelete, onNew, onBack, bp }: HistoryViewProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: bp.mobile ? "12px 14px" : "14px 28px",
        background: T.panel, borderBottom: `1px solid ${T.border}`,
        boxShadow: T.shadowSm, flexWrap: "wrap",
      }}>
        <button onClick={onBack} style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "7px 13px", borderRadius: 9,
          border: `1px solid ${T.border}`, background: T.panel2,
          color: T.sub, font: `600 13px ${T.font}`, cursor: "pointer",
        }}>
          <ArrowLeft size={14} /> Back
        </button>
        <h1 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 800, flex: 1 }}>
          <History size={19} /> Chat History
        </h1>
        <button onClick={onNew} style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "8px 16px", borderRadius: 9,
          border: "none", background: T.accent, color: "#fff",
          font: `700 13px ${T.font}`, cursor: "pointer",
        }}>
          <Plus size={14} /> New Chat
        </button>
      </div>

      {sessions.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 14, color: T.muted, padding: 40 }}>
          <BookMarked size={46} />
          <p style={{ fontSize: 15 }}>No chats yet</p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: bp.mobile ? "1fr" : bp.tablet ? "repeat(2,1fr)" : "repeat(3,1fr)",
          gap: 16, padding: bp.mobile ? "16px 14px" : "24px 28px",
          overflowY: "auto", flex: 1,
        }}>
          {sessions.map((s) => {
            const sub = SUBJECTS[s.subject];
            const mode = MODES[s.mode];
            const last = s.messages[s.messages.length - 1];
            const isActive = s.id === activeId;
            return (
              <div key={s.id} style={{
                background: isActive ? `${T.accent}08` : T.panel,
                border: `1.5px solid ${isActive ? T.accent : T.border}`,
                borderRadius: 16, padding: 16,
                display: "flex", flexDirection: "column", gap: 10,
                boxShadow: T.shadowSm,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", background: sub.bg, color: sub.color, flexShrink: 0 }}>
                    {sub.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: "block", fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.title}
                    </strong>
                    <small style={{ fontSize: 11, color: T.muted }}>
                      {sub.label} · {s.messages.length} msgs · {relTime(s.updatedAt)}
                    </small>
                  </div>
                  <button onClick={() => onDelete(s.id)} style={{
                    width: 28, height: 28, borderRadius: 7,
                    border: "none", background: "transparent",
                    color: T.muted, cursor: "pointer",
                    display: "grid", placeItems: "center", flexShrink: 0,
                  }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                {last && (
                  <p style={{
                    fontSize: 12.5, color: T.sub, lineHeight: 1.55,
                    background: T.panel2, borderRadius: 9, padding: "8px 10px",
                    overflow: "hidden", display: "-webkit-box",
                    WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                  }}>
                    {last.content.slice(0, 160)}
                  </p>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: `${mode.color}18`, color: mode.color }}>
                    {mode.label}
                  </span>
                  <button onClick={() => onOpen(s.id)} style={{
                    display: "flex", alignItems: "center", gap: 4,
                    height: 30, padding: "0 12px", borderRadius: 8,
                    border: `1px solid ${T.border}`, background: T.panel2,
                    color: T.sub, font: `600 12px ${T.font}`, cursor: "pointer",
                  }}>
                    Open <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function HomeworkHelper() {
  useGlobalStyle();
  const bp = useBreakpoint();
  const { user } = useAuth();

  // ── App State ────────────────────────────────────────────
  const [appState, setAppState] = useState<AppState>(loadState);
  const [view, setView] = useState<View>("chat");
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<AttachmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modeDropOpen, setModeDropOpen] = useState(false);
  const [subjDropOpen, setSubjDropOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<any>(null);
  const modeDropRef = useRef<HTMLDivElement>(null);
  const subjDropRef = useRef<HTMLDivElement>(null);

  // ── Derived ───────────────────────────────────────────────
  const active = useMemo(
    () => appState.sessions.find((s) => s.id === appState.activeId) || appState.sessions[0],
    [appState]
  );
  const subj = SUBJECTS[active?.subject ?? "general"];
  const modeConf = MODES[active?.mode ?? "guided"];

  // ── Persist ───────────────────────────────────────────────
  useEffect(() => { saveState(appState); }, [appState]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [active?.messages, loading]);

  useEffect(() => {
    if (!taRef.current) return;
    taRef.current.style.height = "auto";
    taRef.current.style.height = `${Math.min(taRef.current.scrollHeight, 150)}px`;
  }, [input]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modeDropRef.current && !modeDropRef.current.contains(e.target as Node)) setModeDropOpen(false);
      if (subjDropRef.current && !subjDropRef.current.contains(e.target as Node)) setSubjDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── State Mutators ────────────────────────────────────────
  const patchActive = useCallback((fn: (s: ChatSession) => ChatSession) => {
    setAppState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => s.id === prev.activeId ? fn(s) : s),
    }));
  }, []);

  const startNewChat = useCallback((overrides?: Partial<Pick<ChatSession, "subject" | "mode">>) => {
    const s = mkSession();
    if (overrides) Object.assign(s, overrides);
    setAppState((prev) => ({ sessions: [s, ...prev.sessions], activeId: s.id }));
    setInput("");
    setPendingFiles([]);
    setSidebarOpen(false);
  }, []);

  const openSession = useCallback((id: string) => {
    setAppState((prev) => ({ ...prev, activeId: id }));
    setView("chat");
    setSidebarOpen(false);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setAppState((prev) => {
      let sessions = prev.sessions.filter((s) => s.id !== id);
      let activeId = prev.activeId;
      if (!sessions.length) {
        const s = mkSession();
        sessions = [s];
        activeId = s.id;
      } else if (activeId === id) {
        activeId = sessions[0].id;
      }
      return { sessions, activeId };
    });
  }, []);

  const switchMode = useCallback((m: ModeKey) => {
    if (active?.mode === m) { setModeDropOpen(false); return; }
    if (active && active.messages.length > 0) {
      startNewChat({ subject: active.subject, mode: m });
    } else {
      patchActive((s) => ({ ...s, mode: m }));
    }
    setModeDropOpen(false);
  }, [active, startNewChat, patchActive]);

  const switchSubject = useCallback((sub: SubjectKey) => {
    if (active?.subject === sub) { setSubjDropOpen(false); return; }
    if (active && active.messages.length > 0) {
      startNewChat({ subject: sub, mode: active.mode });
    } else {
      patchActive((s) => ({ ...s, subject: sub }));
    }
    setSubjDropOpen(false);
  }, [active, startNewChat, patchActive]);

  const clearCurrentChat = useCallback(() => {
    patchActive((s) => ({ ...s, messages: [], title: "New chat", updatedAt: new Date().toISOString() }));
    setSidebarOpen(false);
  }, [patchActive]);

  // ── File Handling ─────────────────────────────────────────
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    const items = await Promise.all(
      Array.from(files).map(async (f): Promise<AttachmentItem> => {
        const kind: AttachmentItem["kind"] = f.type.startsWith("image/")
          ? "image"
          : f.type.includes("text") || /\.(txt|md|csv|json)$/i.test(f.name)
          ? "document"
          : "other";
        const previewUrl = kind === "image" ? URL.createObjectURL(f) : undefined;
        return { id: uid(), name: f.name, size: f.size, kind, previewUrl };
      })
    );
    setPendingFiles((prev) => [...prev, ...items]);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const removeFile = useCallback((id: string) => {
    setPendingFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  // ── Copy ──────────────────────────────────────────────────
  const copyMessage = useCallback(async (id: string) => {
    const msg = active?.messages.find((m) => m.id === id);
    if (!msg) return;
    await navigator.clipboard.writeText(msg.content).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1400);
  }, [active]);

  // ── Send ──────────────────────────────────────────────────
  const send = useCallback(async (overrideText?: string, overrideFiles?: AttachmentItem[]) => {
    if (!active || loading) return;
    const content = overrideText ?? input.trim();
    const attachments = overrideFiles ?? pendingFiles;
    if (!content && !attachments.length) return;

    const userMsg: Message = {
      id: uid(),
      role: "user",
      content: content + (attachments.length ? `\n[Attached: ${attachments.map((a) => a.name).join(", ")}]` : ""),
      createdAt: new Date().toISOString(),
      attachments,
      animate: false,
    };

    setInput("");
    setPendingFiles([]);
    setLoading(true);

    setAppState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => {
        if (s.id !== prev.activeId) return s;
        return {
          ...s,
          title: s.messages.length === 0 ? (content || attachments[0]?.name || "Homework").slice(0, 52) : s.title,
          messages: [...s.messages, userMsg],
          updatedAt: new Date().toISOString(),
        };
      }),
    }));

    const history = [...active.messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
    const systemPrompt = SYSTEM_PROMPTS[active.mode](SUBJECTS[active.subject].label);

    try {
      const answer = await callAnthropicAPI(history, systemPrompt);
      const aiMsg: Message = {
        id: uid(),
        role: "assistant",
        content: answer,
        createdAt: new Date().toISOString(),
        animate: true, // ← triggers typing animation
      };
      setAppState((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.id !== prev.activeId ? s : { ...s, messages: [...s.messages, aiMsg], updatedAt: new Date().toISOString() }
        ),
      }));
    } catch {
      const aiMsg: Message = {
        id: uid(),
        role: "assistant",
        content: FALLBACKS[active.mode],
        createdAt: new Date().toISOString(),
        animate: true, // ← also animate fallback
      };
      setAppState((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.id !== prev.activeId ? s : { ...s, messages: [...s.messages, aiMsg], updatedAt: new Date().toISOString() }
        ),
      }));
    } finally {
      setLoading(false);
    }
  }, [active, loading, input, pendingFiles]);

  // ── Regenerate ────────────────────────────────────────────
  const regen = useCallback(() => {
    if (!active || loading) return;
    const lastUser = [...active.messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const lastAIIdx = active.messages.reduce((acc, m, i) => (m.role === "assistant" ? i : acc), -1);
    patchActive((s) => ({
      ...s,
      messages: lastAIIdx >= 0 ? s.messages.slice(0, lastAIIdx) : s.messages,
    }));
    setTimeout(() => send(lastUser.content, []), 50);
  }, [active, loading, patchActive, send]);

  // ── Export ────────────────────────────────────────────────
  const exportChat = useCallback(() => {
    if (!active) return;
    const lines = active.messages.map((m) => `${m.role === "user" ? "You" : "GradeUp"}:\n${m.content}`);
    const blob = new Blob(
      [`${active.title}\n${"─".repeat(60)}\n\n${lines.join("\n\n─────\n\n")}`],
      { type: "text/plain" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gradeup-${active.title.slice(0, 30)}.txt`;
    a.click();
  }, [active]);

  // ── Voice Input ───────────────────────────────────────────
  const toggleVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setInput((p) => p + (p ? "\n" : "") + "[Voice not supported in this browser]");
      return;
    }
    if (listening && recogRef.current) {
      recogRef.current.stop();
      setListening(false);
      return;
    }
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = false;
    r.onresult = (e: any) => {
      const t = e.results?.[0]?.[0]?.transcript || "";
      setInput((p) => p + (p ? " " : "") + t);
    };
    r.onend = () => setListening(false);
    recogRef.current = r;
    setListening(true);
    r.start();
  }, [listening]);

  // ─────────────────────────────────────────────────────────
  // HISTORY VIEW
  // ─────────────────────────────────────────────────────────
  if (view === "history") {
    return (
      <HistoryView
        sessions={appState.sessions}
        activeId={appState.activeId}
        onOpen={(id) => { openSession(id); setView("chat"); }}
        onDelete={deleteSession}
        onNew={() => { startNewChat(); setView("chat"); }}
        onBack={() => setView("chat")}
        bp={bp}
      />
    );
  }

  // ─────────────────────────────────────────────────────────
  // LAYOUT
  // ─────────────────────────────────────────────────────────
  const showSidebarInline = bp.desktop;
  const headerH = 58;

  const rootStyle: CSSProperties = {
    display: "flex", flexDirection: "column",
    height: "100vh", overflow: "hidden",
    fontFamily: T.font, background: T.bg, color: T.text,
  };

  const headerStyle: CSSProperties = {
    flexShrink: 0, height: headerH,
    display: "flex", alignItems: "center",
    padding: bp.mobile ? "0 10px" : "0 16px",
    gap: bp.mobile ? 6 : 10,
    background: T.panel, borderBottom: `1px solid ${T.border}`,
    boxShadow: T.shadowSm, zIndex: 50, position: "relative",
  };

  const toolBtnStyle: CSSProperties = {
    width: 34, height: 34, borderRadius: 9,
    border: `1px solid ${T.border}`, background: T.panel2,
    color: T.sub, display: "grid", placeItems: "center",
    cursor: "pointer", flexShrink: 0,
  };

  const dropdownStyle: CSSProperties = {
    position: "absolute", top: "calc(100% + 8px)",
    right: 0, minWidth: 240,
    background: T.panel, border: `1px solid ${T.border}`,
    borderRadius: 14, boxShadow: T.shadowLg,
    zIndex: 200, padding: 6,
    animation: "gu-msgin .15s ease",
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  return (
    <div style={rootStyle}>
      {/* Mobile scrim */}
      {!showSidebarInline && sidebarOpen && (
        <div className="gu-scrim" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ───── HEADER ───── */}
      <Navigation currentRole={user?.role as "student" | "teacher" || "student"} onRoleChange={() => {}} />
      <header style={headerStyle}>
        {/* Hamburger (mobile/tablet) */}
        {!showSidebarInline && (
          <button style={toolBtnStyle} onClick={() => setSidebarOpen((o) => !o)}>
            {sidebarOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        )}

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
            display: "grid", placeItems: "center", color: "#fff",
          }}>
            <GraduationCap size={17} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>GradeUp</span>
            {!bp.mobile && (
              <span style={{ fontSize: 11, color: T.muted, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {active?.title || "New chat"}
              </span>
            )}
          </div>
        </div>

        {/* Subject pills (desktop/tablet) */}
        {!bp.mobile && (
          <div style={{ flex: 1, display: "flex", justifyContent: "center", overflow: "hidden" }}>
            <div style={{
              display: "flex", gap: 3,
              background: T.panel2, border: `1px solid ${T.border}`,
              borderRadius: 12, padding: 3, overflowX: "auto",
            }}>
              {(Object.entries(SUBJECTS) as [SubjectKey, typeof SUBJECTS.general][]).map(([k, v]) => {
                const isA = active?.subject === k;
                return (
                  <button key={k} onClick={() => switchSubject(k)} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: bp.tablet ? "4px 9px" : "4px 11px",
                    borderRadius: 9, border: "none", cursor: "pointer",
                    font: `${isA ? 700 : 500} 12px ${T.font}`,
                    background: isA ? v.color : "transparent",
                    color: isA ? "#fff" : T.sub,
                    whiteSpace: "nowrap", transition: "all .15s",
                  }}>
                    {v.icon} {v.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Right: Mode + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: bp.mobile ? 4 : 6, marginLeft: "auto", flexShrink: 0 }}>

          {/* Subject dropdown (mobile only) */}
          {bp.mobile && (
            <div ref={subjDropRef} style={{ position: "relative" }}>
              <button
                onClick={() => { setSubjDropOpen((o) => !o); setModeDropOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  height: 32, padding: "0 10px", borderRadius: 8,
                  border: `1px solid ${T.border}`, background: subj.bg,
                  color: subj.color, font: `700 11px ${T.font}`, cursor: "pointer",
                }}
              >
                {subj.icon}
                <ChevronDown size={11} />
              </button>
              {subjDropOpen && (
                <div style={{ ...dropdownStyle, minWidth: 180 }}>
                  {(Object.entries(SUBJECTS) as [SubjectKey, typeof SUBJECTS.general][]).map(([k, v]) => {
                    const isA = active?.subject === k;
                    return (
                      <button key={k} onClick={() => switchSubject(k)} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 10px", borderRadius: 8, width: "100%",
                        border: "none", background: isA ? v.bg : "transparent",
                        color: isA ? v.color : T.text,
                        font: `${isA ? 700 : 500} 12.5px ${T.font}`, cursor: "pointer",
                        textAlign: "left", marginBottom: 2,
                      }}>
                        <span style={{ color: v.color }}>{v.icon}</span>
                        {v.label}
                        {isA && <Check size={12} style={{ marginLeft: "auto", color: v.color }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Mode dropdown */}
          <div ref={modeDropRef} style={{ position: "relative" }}>
            <button
              onClick={() => { setModeDropOpen((o) => !o); setSubjDropOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                height: 32, padding: "0 11px", borderRadius: 8,
                border: `1px solid ${T.border}`, background: T.panel2,
                color: modeConf.color, font: `700 12px ${T.font}`, cursor: "pointer",
              }}
            >
              {modeConf.icon}
              <span className="hide-mobile">{modeConf.short}</span>
              <ChevronDown size={12} />
            </button>
            {modeDropOpen && (
              <div style={dropdownStyle}>
                {(Object.entries(MODES) as [ModeKey, typeof MODES.guided][]).map(([k, v]) => {
                  const isA = active?.mode === k;
                  return (
                    <button key={k} onClick={() => switchMode(k)} style={{
                      display: "flex", alignItems: "flex-start", gap: 9,
                      padding: "9px 10px", borderRadius: 9,
                      border: `1.5px solid ${isA ? v.color : "transparent"}`,
                      background: isA ? `${v.color}12` : "transparent",
                      color: isA ? v.color : T.text,
                      font: `500 13px ${T.font}`, cursor: "pointer",
                      width: "100%", textAlign: "left", marginBottom: 2,
                    }}>
                      <span style={{ color: v.color, marginTop: 1 }}>{v.icon}</span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <b style={{ fontSize: 13, fontWeight: 700 }}>{v.label}</b>
                        <small style={{ fontSize: 11, color: T.muted, lineHeight: 1.4 }}>{v.desc}</small>
                      </span>
                      {isA && <Check size={14} style={{ marginLeft: "auto", color: v.color, flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* History (desktop) */}
          {!bp.mobile && (
            <>
              <button style={{
                display: "flex", alignItems: "center", gap: 5,
                height: 32, padding: "0 11px", borderRadius: 8,
                border: `1px solid ${T.border}`, background: T.panel2,
                color: T.sub, font: `600 12px ${T.font}`, cursor: "pointer",
              }} onClick={() => setView("history")}>
                <History size={14} />
                <span className="hide-tablet">History</span>
              </button>
              <button style={{ ...toolBtnStyle, background: T.panel2 }} onClick={exportChat} title="Export chat">
                <Download size={15} />
              </button>
              <button style={{ ...toolBtnStyle, background: T.panel2, color: "#ef4444" }} onClick={clearCurrentChat} title="Clear chat">
                <Trash2 size={15} />
              </button>
            </>
          )}

          {/* History icon (mobile) */}
          {bp.mobile && (
            <button style={{ ...toolBtnStyle, background: "transparent", border: "none" }} onClick={() => setView("history")}>
              <History size={17} />
            </button>
          )}
        </div>
      </header>

      {/* ───── BODY ───── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>

        {/* ───── SIDEBAR ───── */}
        {/* Sidebar: New Chat button (top) + chat history list (scrollable bottom) */}
        <aside style={
          showSidebarInline
            ? {
                width: bp.wide ? 260 : 230,
                flexShrink: 0,
                display: "flex", flexDirection: "column",
                background: T.panel, borderRight: `1px solid ${T.border}`,
                overflow: "hidden",
              }
            : {
                position: "fixed",
                top: headerH, left: 0, bottom: 0,
                width: 250,
                display: "flex", flexDirection: "column",
                background: T.panel, borderRight: `1px solid ${T.border}`,
                overflow: "hidden",
                boxShadow: T.shadowLg, zIndex: 40,
                transform: sidebarOpen ? "translateX(0)" : "translateX(-110%)",
                transition: "transform .25s ease",
              }
        }>
          {/* ── New Chat button pinned to top ── */}
          <div style={{ padding: "12px 12px 8px", flexShrink: 0 }}>
            <button
              onClick={() => startNewChat()}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", height: 40, borderRadius: 11,
                border: "none",
                background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
                color: "#fff", font: `700 13px ${T.font}`, cursor: "pointer",
                boxShadow: "0 2px 10px rgba(74,91,232,.35)",
                transition: "opacity .15s",
              }}
            >
              <Plus size={16} />
              New Chat
            </button>
          </div>

          {/* ── Thin divider ── */}
          <div style={{ height: 1, background: T.border, margin: "0 12px 8px" }} />

          {/* ── Section label ── */}
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: ".08em", color: T.muted,
            padding: "0 16px 6px", flexShrink: 0,
          }}>
            Chat History
          </div>

          {/* ── Scrollable history list ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 12px" }}>
            {appState.sessions.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "24px 16px", color: T.muted }}>
                <MessageSquare size={28} />
                <p style={{ fontSize: 12, textAlign: "center" }}>No chats yet</p>
              </div>
            ) : (
              appState.sessions.map((s) => {
                const sub = SUBJECTS[s.subject];
                const isA = s.id === appState.activeId;
                return (
                  <button
                    key={s.id}
                    className={`gu-hist${isA ? " active" : ""}`}
                    onClick={() => openSession(s.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "7px 10px", borderRadius: 9,
                      border: "none", cursor: "pointer",
                      background: isA ? T.accentSoft : "transparent",
                      color: isA ? T.accent : T.text,
                      font: `500 12.5px ${T.font}`, textAlign: "left",
                      width: "100%", marginBottom: 1,
                    }}
                  >
                    {/* Subject icon */}
                    <span style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: sub.bg, color: sub.color,
                      display: "grid", placeItems: "center", flexShrink: 0,
                    }}>
                      {sub.icon}
                    </span>

                    {/* Title + meta */}
                    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12.5, fontWeight: isA ? 700 : 500 }}>
                        {s.title}
                      </span>
                      <span style={{ fontSize: 10, color: T.muted }}>
                        {s.messages.length} msgs · {relTime(s.updatedAt)}
                      </span>
                    </span>

                    {/* Delete */}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                      style={{
                        width: 20, height: 20, borderRadius: 5,
                        border: "none", background: "transparent",
                        color: T.muted, cursor: "pointer",
                        display: "grid", placeItems: "center", flexShrink: 0,
                        opacity: isA ? 1 : 0,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={(e) => { if (!isA) e.currentTarget.style.opacity = "0"; }}
                    >
                      <X size={11} />
                    </button>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ───── CHAT AREA ───── */}
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Mode banner */}
          <div style={{
            flexShrink: 0, display: "flex", alignItems: "center", gap: 9,
            padding: bp.mobile ? "7px 14px" : "8px 22px",
            borderBottom: `1px solid ${modeConf.color}30`,
            background: `${modeConf.color}07`,
            fontSize: bp.mobile ? 12 : 13, color: T.sub, flexWrap: "wrap",
          }}>
            <span style={{ color: modeConf.color }}>{modeConf.icon}</span>
            <span>
              <b style={{ color: modeConf.color, fontWeight: 700 }}>{modeConf.label}</b>
              {" — "}
              {modeConf.desc}
            </span>
            {bp.mobile && (
              <span style={{
                marginLeft: "auto", fontSize: 11, fontWeight: 700,
                padding: "2px 8px", borderRadius: 20,
                background: subj.bg, color: subj.color,
              }}>
                {subj.label}
              </span>
            )}
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto",
            padding: bp.mobile ? "14px 12px" : bp.tablet ? "18px 18px" : bp.wide ? "28px 64px" : "22px 30px",
          }}>
            {!active?.messages.length ? (
              /* Empty state */
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", textAlign: "center",
                minHeight: "60vh", padding: bp.mobile ? "36px 16px" : "56px 24px",
                gap: 16,
              }}>
                <div style={{
                  width: 68, height: 68, borderRadius: 18,
                  display: "grid", placeItems: "center",
                  background: subj.bg, color: subj.color, marginBottom: 6,
                }}>
                  <span style={{ transform: "scale(2)" }}>{subj.icon}</span>
                </div>
                <h2 style={{ fontSize: bp.mobile ? 20 : 24, fontWeight: 800 }}>
                  {subj.label} Help
                </h2>
                <p style={{ color: T.sub, fontSize: 14, lineHeight: 1.65, maxWidth: 420 }}>
                  Ask any question, upload files, or pick a starter below.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 8 }}>
                  {STARTERS[active?.subject ?? "general"].map((s) => (
                    <button key={s} onClick={() => setInput(s)} style={{
                      padding: "9px 16px", borderRadius: 10,
                      border: `1px solid ${T.border}`, background: T.panel,
                      color: T.text, font: `600 13px ${T.font}`,
                      cursor: "pointer", boxShadow: T.shadowSm,
                    }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              active.messages.map((m) =>
                m.role === "user" ? (
                  /* User bubble */
                  <article key={m.id} className="gu-msgin" style={{
                    display: "flex", flexDirection: "row-reverse",
                    gap: 12, marginBottom: 20, alignItems: "flex-start",
                  }}>
                    <div style={{
                      width: 32, height: 32,
                      borderRadius: "9px 2px 9px 9px",
                      background: T.panel2, border: `1px solid ${T.border}`,
                      display: "grid", placeItems: "center",
                      color: T.sub, fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}>
                      You
                    </div>
                    <div style={{
                      maxWidth: `min(700px, ${bp.mobile ? "calc(100vw - 80px)" : "80%"})`,
                      background: T.accent, color: "#fff",
                      borderRadius: "16px 4px 16px 16px",
                      padding: "12px 15px",
                      fontSize: 13.5, lineHeight: 1.75,
                      whiteSpace: "pre-wrap", overflowWrap: "anywhere",
                    }}>
                      {m.attachments?.length ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                          {m.attachments.map((f) => <FileChip key={f.id} file={f} dark />)}
                        </div>
                      ) : null}
                      {m.content}
                    </div>
                  </article>
                ) : (
                  /* AI bubble with typing animation */
                  <AIBubble
                    key={m.id}
                    msg={m}
                    copiedId={copiedId}
                    onCopy={copyMessage}
                    onRegen={regen}
                  />
                )
              )
            )}

            {/* Loading bubble while awaiting response */}
            {loading && <LoadingBubble />}

            <div ref={endRef} />
          </div>

          {/* ───── COMPOSER ───── */}
          <div style={{
            flexShrink: 0,
            padding: bp.mobile ? "8px 10px 12px" : "10px 18px 16px",
            borderTop: `1px solid ${T.border}`,
            background: T.panel,
          }}>
            {/* Pending files */}
            {pendingFiles.length > 0 && (
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 6,
                maxWidth: bp.wide ? 1000 : "100%",
                margin: "0 auto 10px",
              }}>
                {pendingFiles.map((f) => (
                  <FileChip key={f.id} file={f} removable onRemove={() => removeFile(f.id)} />
                ))}
              </div>
            )}

            {/* Input row */}
            <div style={{
              display: "flex", alignItems: "flex-end", gap: 7,
              background: T.panel2, border: `1.5px solid ${T.border}`,
              borderRadius: 14, padding: "7px 9px",
              maxWidth: bp.wide ? 1000 : "100%", margin: "0 auto",
            }}>
              <input
                ref={fileRef}
                type="file"
                multiple
                style={{ display: "none" }}
                accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv,.json,.ppt,.pptx,.xls,.xlsx"
                onChange={(e) => void handleFiles(e.target.files)}
              />

              {/* Attach */}
              <button
                style={{
                  width: 34, height: 34, borderRadius: 9,
                  border: `1px solid ${T.border}`, background: T.panel,
                  color: T.sub, display: "grid", placeItems: "center",
                  cursor: "pointer", flexShrink: 0,
                }}
                onClick={() => fileRef.current?.click()}
                title="Attach file"
              >
                <Paperclip size={16} />
              </button>

              {/* Textarea */}
              <textarea
                ref={taRef}
                value={input}
                rows={1}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder={`Ask anything — ${modeConf.short} mode active…`}
                style={{
                  flex: 1, border: "none", outline: "none",
                  background: "transparent",
                  font: `14px/1.6 ${T.font}`, color: T.text,
                  resize: "none", minHeight: 34, maxHeight: 150,
                  padding: "5px 4px",
                }}
              />

              {/* Voice */}
              <button
                style={{
                  width: 34, height: 34, borderRadius: 9,
                  border: `1px solid ${listening ? T.accent : T.border}`,
                  background: listening ? T.accentSoft : T.panel,
                  color: listening ? T.accent : T.sub,
                  display: "grid", placeItems: "center",
                  cursor: "pointer", flexShrink: 0,
                }}
                onClick={toggleVoice}
                title="Voice input"
              >
                {listening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              {/* Send */}
              <button
                className="gu-send-btn"
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  border: "none",
                  background: loading || (!input.trim() && !pendingFiles.length)
                    ? T.muted
                    : `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
                  color: "#fff", display: "grid", placeItems: "center",
                  cursor: loading || (!input.trim() && !pendingFiles.length) ? "not-allowed" : "pointer",
                  flexShrink: 0,
                }}
                onClick={() => void send()}
                disabled={loading || (!input.trim() && !pendingFiles.length)}
              >
                {loading
                  ? <Loader2 size={16} className="gu-spin" />
                  : <Send size={15} />
                }
              </button>
            </div>

            <p style={{
              fontSize: 11, color: T.muted, textAlign: "center",
              marginTop: 7,
              maxWidth: bp.wide ? 1000 : "100%",
              margin: "7px auto 0",
            }}>
              Supports images, PDFs, documents · Enter to send · Shift+Enter for new line
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}