/**
 * homework-helper-page.tsx
 * GradeUp — AI-powered homework assistant
 *
 * Vibrant, modern UI redesign matching student-dashboard.tsx:
 * - Dynamic animated background with glowing radial gradients, floating orbs, ribbon, and sparkles
 * - Cohesive theme tokens with complete Dark Mode & Light Mode support
 * - Rich animations (sdCardIn, sdBreathe, sdPop3d, sdShine, sdPulseSoft, sdDrift, sdGlowMove)
 * - Playful mascot-themed empty state with colorful interactive prompt cards
 * - Glassmorphic sidebar, homework context card, and chat history
 * - Fully responsive across mobile, tablet, and desktop
 * - 100% preservation of state, APIs, handlers, and functional logic
 */

import { useAuth } from "../hooks/use-auth";
import { useTheme } from "../hooks/use-theme";
import Navigation from "../components/navigation";
import {
  getLibrarySubjects,
  getLibraryUnitDisplayLabel,
  getHomeworkChatHistory,
  getHomeworkChatSession,
  sendHomeworkChat,
  type LibrarySubject,
  type LibraryUnit,
  type HomeworkChatSession,
  type HomeworkChatSessionSummary,
} from "../lib/gradeupApi";
import { useLocation } from "wouter";
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
  ArrowRight,
  BookMarked,
  BookOpen,
  Brain,
  Check,
  CheckCircle,
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
  MessageSquare,
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
} from "lucide-react";

import studyRobo from "../assets/dashboard/study-robo.png";
import askGeni from "../assets/dashboard/ask-geni.gif";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type Role = "user" | "assistant";
type SubjectKey = "general" | "math" | "science" | "english" | "history" | "coding";
type SubjectValue = SubjectKey | string;
type ModeKey = "guided" | "full" | "check";
type View = "chat" | "history";

interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  kind: "image";
  previewUrl?: string;
  base64?: string;
}

interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  attachments?: AttachmentItem[];
  animate?: boolean;
}

interface ChatSession {
  id: string;
  homeworkId?: string;
  title: string;
  subject: SubjectValue;
  mode: ModeKey;
  messages: Message[];
  updatedAt: string;
  status?: string;
  currentQuestion?: string;
  currentQuestionIndex?: number;
  totalQuestions?: number;
  subjectGroupKey?: string | null;
  unitId?: string | null;
  unitTitle?: string | null;
  board?: string | null;
  classNumber?: string | null;
  unitNumber?: number | null;
  term?: string | null;
  topicId?: string | null;
  topicLabel?: string | null;
}

interface AppState {
  sessions: ChatSession[];
  activeId: string;
}

const T = {
  bg: "#f3f6ff",
  panel: "#ffffff",
  panel2: "#f7f9ff",
  border: "rgba(148,163,184,.2)",
  text: "#111827",
  sub: "#475569",
  muted: "#64748b",
  accent: "#4f46e5",
  accent2: "#7c3aed",
  accentSoft: "rgba(79,70,229,.10)",
  tutor: "#f59e0b",
  full: "#2563eb",
  check: "#10b981",
  radius: "12px",
  radiusLg: "18px",
  shadow: "0 16px 40px rgba(15, 23, 42, 0.12)",
  shadowSm: "0 8px 24px rgba(15, 23, 42, 0.08)",
  font: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'SFMono-Regular', monospace",
} as const;

// ─────────────────────────────────────────────────────────────
// SUBJECTS & MODES CONFIG
// SUBJECTS & STARTERS CONFIG
// ─────────────────────────────────────────────────────────────

const SUBJECTS: Record<
  SubjectKey,
  { label: string; color: string; bg: string; icon: ReactNode }
> = {
  general: { label: "General", color: "#4a5be8", bg: "rgba(74,91,232,.12)", icon: <Sparkles size={15} /> },
  math: { label: "Math", color: "#0ea5e9", bg: "rgba(14,165,233,.14)", icon: <Brain size={15} /> },
  science: { label: "Science", color: "#10b981", bg: "rgba(16,185,129,.14)", icon: <Search size={15} /> },
  english: { label: "English", color: "#8b5cf6", bg: "rgba(139,92,246,.14)", icon: <PenLine size={15} /> },
  history: { label: "History", color: "#f59e0b", bg: "rgba(245,158,11,.16)", icon: <BookOpen size={15} /> },
  coding: { label: "Coding", color: "#ef4444", bg: "rgba(239,68,68,.14)", icon: <FileText size={15} /> },
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
    color: "#2563eb",
  },
  check: {
    label: "Check Work",
    short: "Check",
    desc: "Review your work, find errors, give feedback",
    icon: <CheckCircle size={15} />,
    color: "#10b981",
  },
};

interface StarterPrompt {
  title: string;
  desc: string;
  icon: string;
  color: string;
}

const STARTERS: Record<SubjectKey, StarterPrompt[]> = {
  general: [
    { title: "Explain this concept", desc: "Break down the core idea simply", icon: "💡", color: "#4a5be8" },
    { title: "Help me understand", desc: "Guide me step-by-step with examples", icon: "🧠", color: "#7c3aed" },
    { title: "Make a revision plan", desc: "Organize key focus points for this unit", icon: "📅", color: "#0ea5e9" },
  ],
  math: [
    { title: "Solve step by step", desc: "Walk through the full calculation method", icon: "🔢", color: "#0ea5e9" },
    { title: "Explain the formula", desc: "Why this formula works and how to apply it", icon: "📐", color: "#2563eb" },
    { title: "Check my working", desc: "Spot errors in my problem solving", icon: "✓", color: "#10b981" },
  ],
  science: [
    { title: "Explain the concept", desc: "Underlying mechanism and scientific laws", icon: "🔬", color: "#10b981" },
    { title: "Summarize key terms", desc: "Core definitions and important diagrams", icon: "🧪", color: "#00a7c8" },
    { title: "Practical examples", desc: "Real-world applications and experiments", icon: "⚡", color: "#f59e0b" },
  ],
  english: [
    { title: "Draft essay outline", desc: "Structure arguments and supportive evidence", icon: "📝", color: "#8b5cf6" },
    { title: "Analyse themes", desc: "Character motivations, themes, and metaphors", icon: "📖", color: "#ec4899" },
    { title: "Improve writing flow", desc: "Enhance vocabulary and sentence structure", icon: "✨", color: "#3b82f6" },
  ],
  history: [
    { title: "Build a timeline", desc: "Key milestones, dates, and historical shifts", icon: "📜", color: "#f59e0b" },
    { title: "Explain the causes", desc: "Main drivers and resulting consequences", icon: "🏛️", color: "#d97706" },
    { title: "Revision summary", desc: "Fast bulleted facts for quick exam review", icon: "🎯", color: "#2563eb" },
  ],
  coding: [
    { title: "Debug my code", desc: "Detect syntax or logic bugs with explanations", icon: "💻", color: "#ef4444" },
    { title: "Explain this error", desc: "Understand error traces and resolve them", icon: "🔍", color: "#f97316" },
    { title: "Algorithm walkthrough", desc: "Pseudocode & step-by-step breakdown", icon: "⚙️", color: "#8b5cf6" },
  ],
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
  subject: "",
  mode: "guided",
  messages: [],
  updatedAt: new Date().toISOString(),
  subjectGroupKey: null,
  unitId: null,
  unitTitle: null,
  board: null,
  classNumber: null,
  unitNumber: null,
  term: null,
  topicId: null,
  topicLabel: null,
});

const normalizeSubject = (value?: string | null): SubjectKey => {
  const key = (value || "general").toLowerCase();
  if (key in SUBJECTS) return key as SubjectKey;
  if (key.includes("math")) return "math";
  if (key.includes("science") || key.includes("physics") || key.includes("chem") || key.includes("bio")) return "science";
  if (key.includes("english")) return "english";
  if (key.includes("history") || key.includes("social")) return "history";
  return "general";
};

const getSubjectConfig = (value?: string | null) => SUBJECTS[normalizeSubject(value)];

const sessionSummaryToChat = (item: HomeworkChatSessionSummary): ChatSession => ({
  id: item.homework_id,
  homeworkId: item.homework_id,
  title: item.title || "Homework chat",
  subject: item.subject || "",
  mode: "guided",
  messages: [],
  updatedAt: item.updated_at || item.assigned_at || new Date().toISOString(),
  status: item.status || undefined,
  currentQuestionIndex: item.current_question_index,
  totalQuestions: item.total_questions,
  subjectGroupKey: item.subject_group_key || null,
  unitId: item.unit_id || null,
  unitTitle: item.unit_title || null,
  board: item.board || null,
  classNumber: item.class_number || null,
  unitNumber: item.unit_number || null,
  term: item.term || null,
  topicId: item.topic_id || null,
  topicLabel: item.topic_label || null,
});

const sessionDetailToChat = (session: HomeworkChatSession): ChatSession => ({
  ...sessionSummaryToChat({
    homework_id: session.homework_id,
    title: session.title || "Homework chat",
    subject_group_key: session.subject_group_key,
    unit_id: session.unit_id,
    unit_title: session.unit_title,
    subject: session.subject,
    unit_number: session.unit_number,
    board: session.board,
    class_number: session.class_number,
    term: session.term,
    topic_id: session.topic_id,
    topic_label: session.topic_label,
    status: session.status,
    message_count: session.chat_history?.length || 0,
    current_question_index: session.current_question_index,
    total_questions: session.total_questions,
    assigned_at: session.assigned_at,
    updated_at: session.updated_at,
  }),
  currentQuestion: session.current_question,
  messages: (session.chat_history || []).map((m) => ({
    id: uid(),
    role: m.role === "user" ? "user" : "assistant",
    content: m.content || "",
    createdAt: m.timestamp || session.updated_at || new Date().toISOString(),
    animate: false,
  })),
});

const fileToBase64 = (file: File): Promise<string | undefined> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(undefined);
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.includes(",") ? result.split(",")[1] : result || undefined);
    };
    reader.readAsDataURL(file);
  });

const STORAGE_KEY = "gradeup-homework-helper-v4";

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.sessions?.length) throw new Error("no sessions");
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
    const clean: AppState = {
      ...state,
      sessions: state.sessions.map((s) => ({
        ...s,
        messages: s.messages.map((m) => ({ ...m, animate: false })),
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    /* storage quota fallback */
  }
}

// Markdown → HTML parser adapted to CSS custom properties
function mdToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _lang, code) =>
      `<pre style="background:var(--sd-card-soft);border:1px solid var(--sd-line);border-radius:10px;padding:12px 14px;overflow-x:auto;margin:10px 0;font-family:var(--sd-mono);font-size:12.5px;color:var(--sd-ink);box-shadow:inset 0 1px 3px rgba(0,0,0,0.04)">${code.trim()}</pre>`
    )
    .replace(/`([^`]+)`/g, `<code style="font-family:var(--sd-mono);font-size:12.5px;background:var(--sd-card-soft);border:1px solid var(--sd-line);padding:2px 6px;border-radius:6px;color:var(--sd-accent);font-weight:600">$1</code>`)
    .replace(/^### (.+)$/gm, '<h3 style="font-size:14.5px;font-weight:800;margin:12px 0 5px;color:var(--sd-ink)">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:16px;font-weight:800;margin:14px 0 6px;color:var(--sd-ink)">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:18px;font-weight:900;margin:16px 0 7px;color:var(--sd-ink)">$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong style='font-weight:700;color:var(--sd-ink)'>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^---$/gm, `<hr style="border:none;border-top:1px solid var(--sd-line);margin:14px 0">`)
    .replace(/^\d+\. (.+)$/gm, "<li style='margin:4px 0;line-height:1.65'>$1</li>")
    .replace(/^[•\-\*] (.+)$/gm, "<li style='margin:4px 0;line-height:1.65'>$1</li>")
    .replace(/(<li[\s\S]+?<\/li>)/g, `<ul style="padding-left:20px;margin:8px 0">$1</ul>`)
    .replace(/<\/ul>\s*<ul[^>]*>/g, "")
    .replace(/\n\n+/g, "</p><p style='margin:6px 0'>")
    .replace(/\n/g, "<br>")
    .replace(/^([^<])/, "<p style='margin:6px 0'>$1")
    .replace(/([^>])$/, "$1</p>");
}

// ─────────────────────────────────────────────────────────────
// GLOBAL CSS WITH STUDENT DASHBOARD THEME AND ANIMATIONS
// ─────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; }

.hh-root {
  min-height: 100vh;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  color: var(--sd-ink);
  background: radial-gradient(circle at 14% 9%, rgba(126,87,255,.12), transparent 26%),
              radial-gradient(circle at 88% 14%, rgba(255,178,29,.16), transparent 25%),
              linear-gradient(180deg, var(--sd-page), var(--sd-page-2));
  --sd-page: #fbfcff;
  --sd-page-2: #f5f7ff;
  --sd-card: rgba(255, 255, 255, 0.88);
  --sd-card-soft: rgba(247, 250, 255, 0.78);
  --sd-card-solid: #ffffff;
  --sd-ink: #071235;
  --sd-muted: #68708a;
  --sd-faint: #8c94aa;
  --sd-line: rgba(15, 23, 42, 0.10);
  --sd-shadow: 0 12px 30px rgba(35, 44, 87, 0.10);
  --sd-shadow-soft: 0 7px 18px rgba(35, 44, 87, 0.08);
  --sd-accent: #2563eb;
  --sd-accent2: #7c3aed;
  --sd-bubble-user: linear-gradient(135deg, #2563eb, #4f46e5);
  --sd-bubble-ai: rgba(255, 255, 255, 0.94);
  --sd-mono: 'JetBrains Mono', monospace;
  position: relative;
}

[data-theme="dark"] .hh-root,
.dark .hh-root {
  --sd-page: #080d1f;
  --sd-page-2: #10172d;
  --sd-card: rgba(23, 31, 58, 0.92);
  --sd-card-soft: rgba(31, 42, 76, 0.72);
  --sd-card-solid: #171f3a;
  --sd-ink: #f6f7ff;
  --sd-muted: #b5bfd8;
  --sd-faint: #7f8aa7;
  --sd-line: rgba(255, 255, 255, 0.12);
  --sd-shadow: 0 20px 54px rgba(0, 0, 0, 0.36);
  --sd-shadow-soft: 0 12px 30px rgba(0, 0, 0, 0.24);
  --sd-accent: #38bdf8;
  --sd-accent2: #a855f7;
  --sd-bubble-user: linear-gradient(135deg, #1d4ed8, #4338ca);
  --sd-bubble-ai: rgba(23, 31, 58, 0.95);
}

.hh-root::before, .hh-root::after {
  content: "";
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(.2px);
  opacity: .55;
  animation: sdFloatBg 12s ease-in-out infinite alternate;
  z-index: 0;
}
.hh-root::before {
  width: 270px;
  height: 270px;
  left: -80px;
  top: 70px;
  background: radial-gradient(circle, rgba(46,182,255,.18), transparent 68%);
}
.hh-root::after {
  width: 310px;
  height: 310px;
  right: -90px;
  top: 340px;
  background: radial-gradient(circle, rgba(255,95,153,.14), transparent 70%);
  animation-delay: -5s;
}

@keyframes sdFloatBg {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(24px, 28px, 0) scale(1.08); }
}
@keyframes sdCardIn {
  from { opacity: 0; transform: translateY(14px) scale(.985); }
  to { opacity: 1; transform: none; }
}
@keyframes sdShine {
  0% { transform: translateX(-120%) rotate(18deg); }
  45%, 100% { transform: translateX(220%) rotate(18deg); }
}
@keyframes sdBreathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}
@keyframes sdPulseSoft {
  0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,.28); }
  50% { box-shadow: 0 0 0 9px rgba(37,99,235,0); }
}
@keyframes sdDrift {
  0%, 100% { transform: translate3d(0,0,0) rotate(0); }
  50% { transform: translate3d(18px,-14px,0) rotate(7deg); }
}
@keyframes sdGlowMove {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
@keyframes sdWiggle {
  0%, 100% { transform: rotate(0) scale(1); }
  35% { transform: rotate(-2.5deg) scale(1.03); }
  70% { transform: rotate(2.5deg) scale(1.03); }
}
@keyframes sdPop3d {
  0%, 100% { transform: translateY(0) rotate(-2deg) scale(1); }
  50% { transform: translateY(-7px) rotate(3deg) scale(1.05); }
}
@keyframes sdBgWave {
  0%, 100% { transform: translate3d(-2%,0,0) rotate(0); }
  50% { transform: translate3d(2%,-2%,0) rotate(2deg); }
}
@keyframes sdProgressSweep {
  0% { transform: translateX(-120%) skewX(-20deg); }
  100% { transform: translateX(220%) skewX(-20deg); }
}
@keyframes gu-blink { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes gu-dot { 0%,80%,100%{transform:scale(.55);opacity:.35} 40%{transform:scale(1);opacity:1} }
@keyframes gu-spin { to { transform: rotate(360deg); } }

.sd-bg-spark {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  border-radius: 999px;
  opacity: .48;
  animation: sdDrift 9s ease-in-out infinite;
}
.sd-bg-spark.s1 {
  left: 48%; top: 85px; width: 9px; height: 9px;
  background: #ffb21d; box-shadow: 34px 28px 0 #27b86a, 76px -14px 0 #2389ff;
}
.sd-bg-spark.s2 {
  right: 14%; top: 220px; width: 7px; height: 7px;
  background: #ff4d8d; box-shadow: -48px 46px 0 #7e45e8, -86px -18px 0 #00a7c8;
  animation-delay: -3s;
}
.sd-bg-spark.s3 {
  left: 7%; bottom: 120px; width: 8px; height: 8px;
  background: #27b86a; box-shadow: 42px -34px 0 #ff791f, 92px 18px 0 #2389ff;
  animation-delay: -5s;
}

.sd-bg-ribbon {
  position: absolute; pointer-events: none; z-index: 0;
  left: 4%; right: 4%; top: 110px; height: 160px;
  border-radius: 50%;
  background: linear-gradient(90deg, rgba(35,137,255,.08), rgba(255,178,29,.10), rgba(39,184,106,.08));
  filter: blur(20px); opacity: .75;
  animation: sdBgWave 13s ease-in-out infinite;
}

.hh-glass {
  background: var(--sd-card);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--sd-line);
}

.hh-card {
  background: var(--sd-card);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--sd-line);
  border-radius: 16px;
  box-shadow: var(--sd-shadow-soft);
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}
.hh-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--sd-shadow);
  border-color: rgba(37, 99, 235, 0.22);
}

.gu-cursor {
  display: inline-block; width: 2.5px; height: .95em;
  background: var(--sd-accent); vertical-align: middle; margin-left: 3px;
  border-radius: 2px; animation: gu-blink .7s step-end infinite;
}
[data-theme="dark"] .gu-cursor,
.dark .gu-cursor {
  box-shadow: 0 0 10px rgba(56, 189, 248, .85);
}

.gu-dots { display: flex; gap: 5px; align-items: center; }
.gu-dots span {
  width: 8px; height: 8px; border-radius: 50%;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  animation: gu-dot .9s ease infinite;
}
.gu-dots span:nth-child(2) { animation-delay: .18s; }
.gu-dots span:nth-child(3) { animation-delay: .36s; }

.gu-spin { animation: gu-spin 1s linear infinite; }
.gu-msgin { animation: sdCardIn .35s ease both; }

.gu-scrim {
  position: fixed; inset: 0; background: rgba(7, 18, 53, 0.55);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  z-index: 45; animation: sdCardIn .2s ease;
}

.gu-prose { white-space: normal; word-break: break-word; overflow-wrap: anywhere; }
.gu-prose p { margin: 6px 0; line-height: 1.72; }
.gu-prose ul, .gu-prose ol { padding-left: 20px; margin: 8px 0; }
.gu-prose li { margin: 4px 0; line-height: 1.65; }

/* Custom scrollbars */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-thumb {
  background: rgba(140, 148, 170, 0.35);
  border-radius: 999px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(140, 148, 170, 0.55);
}
::-webkit-scrollbar-track { background: transparent; }

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
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = GLOBAL_CSS;
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
  return { mobile: w < 640, tablet: w >= 640 && w < 1024, desktop: w >= 1024, wide: w >= 1400, w };
}

// ─────────────────────────────────────────────────────────────
// TYPING ANIMATION HOOK
// ─────────────────────────────────────────────────────────────

function useTypingAnimation(
  target: string,
  shouldAnimate: boolean,
  speed = 14
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
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

interface FileChipProps {
  file: AttachmentItem;
  removable?: boolean;
  onRemove?: () => void;
  dark?: boolean;
  large?: boolean;
}

function FileChip({ file, removable, onRemove, large }: FileChipProps) {
  if (large && file.previewUrl) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid var(--sd-line)",
          background: "var(--sd-card-soft)",
          boxShadow: "var(--sd-shadow-soft)",
        }}
      >
        <img
          src={file.previewUrl}
          alt={file.name}
          style={{ display: "block", width: "100%", maxHeight: 260, objectFit: "contain", background: "rgba(0,0,0,.15)" }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "8px 12px",
            color: "var(--sd-ink)",
          }}
        >
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, fontWeight: 700 }}>
            {file.name}
          </span>
          <small style={{ fontSize: 10, color: "var(--sd-muted)", flexShrink: 0 }}>{fmtBytes(file.size)}</small>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 10,
        border: "1px solid var(--sd-line)",
        background: "var(--sd-card-soft)",
        maxWidth: 240,
        color: "var(--sd-ink)",
        flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0,0,0,.04)",
      }}
    >
      {file.previewUrl ? (
        <img
          src={file.previewUrl}
          alt={file.name}
          style={{ width: 30, height: 30, borderRadius: 6, objectFit: "cover" }}
        />
      ) : (
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 6,
            background: "rgba(37,99,235,.12)",
            color: "var(--sd-accent)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <FileText size={14} />
        </span>
      )}
      <span style={{ minWidth: 0, display: "flex", flexDirection: "column", flex: 1 }}>
        <b style={{ fontSize: 11.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140, display: "block" }}>
          {file.name}
        </b>
        <small style={{ fontSize: 10, color: "var(--sd-muted)" }}>{fmtBytes(file.size)}</small>
      </span>
      {removable && (
        <button
          onClick={onRemove}
          style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            border: "none",
            background: "transparent",
            color: "var(--sd-muted)",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            transition: "color .15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--sd-muted)")}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

function AvatarAI() {
  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: "12px 12px 12px 4px",
        background: "linear-gradient(135deg, #2563eb, #7c3aed)",
        display: "grid",
        placeItems: "center",
        color: "#fff",
        flexShrink: 0,
        boxShadow: "0 6px 14px rgba(37,99,235,.28)",
        animation: "sdPop3d 4.2s ease-in-out infinite",
      }}
    >
      <GraduationCap size={19} />
    </div>
  );
}

function ActionButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 28,
        padding: "0 11px",
        borderRadius: 8,
        border: "1px solid var(--sd-line)",
        background: "var(--sd-card-soft)",
        color: "var(--sd-ink)",
        fontSize: 11.5,
        fontWeight: 700,
        cursor: "pointer",
        transition: "all .18s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.borderColor = "var(--sd-accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.borderColor = "var(--sd-line)";
      }}
    >
      {children}
    </button>
  );
}

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
    <article
      className="gu-msgin"
      style={{
        display: "flex",
        gap: 12,
        marginBottom: 20,
        alignItems: "flex-start",
      }}
    >
      <AvatarAI />
      <div
        style={{
          background: "var(--sd-bubble-ai)",
          border: "1px solid var(--sd-line)",
          borderRadius: "4px 18px 18px 18px",
          padding: "14px 18px",
          boxShadow: "var(--sd-shadow-soft)",
          fontSize: 13.5,
          lineHeight: 1.72,
          color: "var(--sd-ink)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          maxWidth: "min(780px, 86%)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <div className="gu-prose" dangerouslySetInnerHTML={{ __html: mdToHtml(renderedText) }} />
        {shouldAnimate && !done && <span className="gu-cursor" />}
        {showActions && (
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", borderTop: "1px solid var(--sd-line)", paddingTop: 8 }}>
            <ActionButton onClick={() => onCopy(msg.id)}>
              {copiedId === msg.id ? (
                <>
                  <Check size={12} style={{ color: "#10b981" }} /> Copied
                </>
              ) : (
                <>
                  <Clipboard size={12} /> Copy
                </>
              )}
            </ActionButton>
            <ActionButton onClick={onRegen}>
              <RefreshCw size={12} /> Regenerate
            </ActionButton>
          </div>
        )}
      </div>
    </article>
  );
}

function LoadingBubble() {
  return (
    <article
      className="gu-msgin"
      style={{
        display: "flex",
        gap: 12,
        marginBottom: 20,
        alignItems: "flex-start",
      }}
    >
      <AvatarAI />
      <div
        style={{
          background: "var(--sd-bubble-ai)",
          border: "1px solid var(--sd-line)",
          borderRadius: "4px 18px 18px 18px",
          padding: "14px 20px",
          boxShadow: "var(--sd-shadow-soft)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <div className="gu-dots">
          <span />
          <span />
          <span />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--sd-muted)" }}>
          GradeUp AI is thinking…
        </span>
      </div>
    </article>
  );
}

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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "transparent",
        color: "var(--sd-ink)",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: bp.mobile ? "12px 16px" : "16px 28px",
          background: "var(--sd-card)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--sd-line)",
          boxShadow: "var(--sd-shadow-soft)",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid var(--sd-line)",
            background: "var(--sd-card-soft)",
            color: "var(--sd-ink)",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            transition: "all .18s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateX(-2px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
        >
          <ArrowLeft size={15} /> Back to Chat
        </button>

        <h1
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            fontSize: bp.mobile ? 18 : 20,
            fontWeight: 900,
            flex: 1,
            color: "var(--sd-ink)",
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              display: "grid",
              placeItems: "center",
              color: "#fff",
            }}
          >
            <History size={17} />
          </span>
          Homework Chat History
        </h1>

        <button
          onClick={onNew}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 18px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg, #2563eb, #7c3aed)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
            boxShadow: "0 8px 18px rgba(37,99,235,.3)",
            transition: "transform .18s, box-shadow .18s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 12px 24px rgba(37,99,235,.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "0 8px 18px rgba(37,99,235,.3)";
          }}
        >
          <Plus size={15} /> New Chat
        </button>
      </div>

      {sessions.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            gap: 14,
            color: "var(--sd-muted)",
            padding: 40,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              background: "var(--sd-card)",
              display: "grid",
              placeItems: "center",
              boxShadow: "var(--sd-shadow)",
              animation: "sdBreathe 4s infinite ease-in-out",
            }}
          >
            <BookMarked size={34} style={{ color: "var(--sd-accent)" }} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700 }}>No homework chats recorded yet</p>
          <button
            onClick={onNew}
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Start your first conversation
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: bp.mobile ? "1fr" : bp.tablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
            gap: 16,
            padding: bp.mobile ? "16px 14px" : "24px 28px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {sessions.map((s) => {
            const sub = getSubjectConfig(s.subject);
            const mode = MODES[s.mode];
            const last = s.messages[s.messages.length - 1];
            const isActive = s.id === activeId;
            return (
              <div
                key={s.id}
                className="hh-card"
                style={{
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  borderColor: isActive ? "var(--sd-accent)" : "var(--sd-line)",
                  background: isActive
                    ? "linear-gradient(180deg, var(--sd-card), var(--sd-card-soft))"
                    : "var(--sd-card)",
                  boxShadow: isActive ? "0 10px 24px rgba(37,99,235,.15)" : "var(--sd-shadow-soft)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      display: "grid",
                      placeItems: "center",
                      background: sub.bg,
                      color: sub.color,
                      flexShrink: 0,
                      boxShadow: "0 4px 10px rgba(0,0,0,.08)",
                      animation: "sdPop3d 4s ease-in-out infinite",
                    }}
                  >
                    {sub.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong
                      style={{
                        display: "block",
                        fontSize: 14,
                        fontWeight: 800,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "var(--sd-ink)",
                      }}
                    >
                      {s.title}
                    </strong>
                    <small style={{ fontSize: 11, fontWeight: 700, color: "var(--sd-muted)" }}>
                      {sub.label} · {s.messages.length} msgs · {relTime(s.updatedAt)}
                    </small>
                  </div>
                  <button
                    onClick={() => onDelete(s.id)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: "none",
                      background: "transparent",
                      color: "var(--sd-muted)",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      transition: "all .15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#ef4444";
                      e.currentTarget.style.background = "rgba(239,68,68,.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--sd-muted)";
                      e.currentTarget.style.background = "transparent";
                    }}
                    title="Delete chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {last && (
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "var(--sd-muted)",
                      lineHeight: 1.55,
                      background: "var(--sd-card-soft)",
                      borderRadius: 10,
                      padding: "9px 12px",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as const,
                      border: "1px solid var(--sd-line)",
                    }}
                  >
                    {last.content.slice(0, 160)}
                  </p>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: `${mode.color}16`,
                      color: mode.color,
                      border: `1px solid ${mode.color}30`,
                    }}
                  >
                    {mode.label}
                  </span>
                  <button
                    onClick={() => onOpen(s.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      height: 32,
                      padding: "0 14px",
                      borderRadius: 9,
                      border: "1px solid var(--sd-line)",
                      background: "var(--sd-card-soft)",
                      color: "var(--sd-ink)",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      transition: "all .18s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--sd-accent)";
                      e.currentTarget.style.color = "var(--sd-accent)";
                      e.currentTarget.style.transform = "translateX(2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--sd-line)";
                      e.currentTarget.style.color = "var(--sd-ink)";
                      e.currentTarget.style.transform = "none";
                    }}
                  >
                    Open <ChevronRight size={13} />
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
  const [location] = useLocation();
  const { user } = useAuth();
  const { isDark } = useTheme();

  // ── App State ────────────────────────────────────────────
  const [appState, setAppState] = useState<AppState>(loadState);
  const [subjectCatalog, setSubjectCatalog] = useState<LibrarySubject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [contextHydrated, setContextHydrated] = useState(false);
  const [view, setView] = useState<View>("chat");
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<AttachmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<any>(null);

  // ── Derived ───────────────────────────────────────────────
  const active = useMemo(
    () => appState.sessions.find((s) => s.id === appState.activeId) || appState.sessions[0],
    [appState]
  );
  const activeSubjectGroup = useMemo(
    () => subjectCatalog.find((subject) => subject.subjectGroupKey === active?.subjectGroupKey) || null,
    [subjectCatalog, active?.subjectGroupKey]
  );
  const availableUnits = activeSubjectGroup?.units || [];
  const activeUnit = useMemo(
    () => availableUnits.find((unit) => unit.id === active?.unitId) || null,
    [availableUnits, active?.unitId]
  );
  const subj = getSubjectConfig(active?.subject);
  const modeConf = MODES[active?.mode ?? "guided"];
  const hasRequiredContext = Boolean(active?.subjectGroupKey && active?.unitId);

  // ── Persist ───────────────────────────────────────────────
  useEffect(() => {
    saveState(appState);
  }, [appState]);

  useEffect(() => {
    if (!endRef.current || typeof endRef.current.scrollIntoView !== "function") return;
    endRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [active?.messages, loading]);

  useEffect(() => {
    if (!taRef.current) return;
    taRef.current.style.height = "auto";
    taRef.current.style.height = `${Math.min(taRef.current.scrollHeight, 150)}px`;
  }, [input]);

  useEffect(() => {
    let cancelled = false;
    async function loadSubjects() {
      setSubjectsLoading(true);
      try {
        const data = await getLibrarySubjects();
        if (!cancelled) setSubjectCatalog(data || []);
      } catch (error) {
        console.warn("Failed to load homework helper subjects", error);
        if (!cancelled) setSubjectCatalog([]);
      } finally {
        if (!cancelled) setSubjectsLoading(false);
      }
    }
    void loadSubjects();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (contextHydrated || !subjectCatalog.length) return;
    const queryString = location.includes("?") ? location.split("?")[1] : "";
    const params = new URLSearchParams(queryString);
    const subjectGroupKey = params.get("subjectGroupKey");
    const unitId = params.get("unitId");
    if (!subjectGroupKey && !unitId) {
      setContextHydrated(true);
      return;
    }

    const subjectGroup =
      subjectCatalog.find((item) => item.subjectGroupKey === subjectGroupKey) ||
      subjectCatalog.find((item) => item.units.some((unit) => unit.id === unitId));
    const unit =
      subjectGroup?.units.find((item) => item.id === unitId) ||
      subjectGroup?.units.find((item) => String(item.unitNumber || "") === String(params.get("unitNumber") || "")) ||
      null;

    if (subjectGroup && unit) {
      setAppState((prev) => ({
        ...prev,
        sessions: prev.sessions.map((session) =>
          session.id !== prev.activeId
            ? session
            : {
                ...session,
                subjectGroupKey: subjectGroup.subjectGroupKey,
                subject: unit.subject || subjectGroup.subject,
                unitId: unit.id,
                unitTitle: getLibraryUnitDisplayLabel(unit),
                unitNumber: unit.unitNumber ?? null,
                board: unit.board || subjectGroup.board,
                classNumber: unit.standard || subjectGroup.standard,
                term: unit.term || subjectGroup.term || null,
                topicId: params.get("topicId"),
                topicLabel: params.get("topic") || params.get("topicLabel"),
              }
        ),
      }));
    }
    setContextHydrated(true);
  }, [contextHydrated, location, subjectCatalog]);

  useEffect(() => {
    let cancelled = false;
    async function loadHomeworkHistory() {
      try {
        const history = await getHomeworkChatHistory();
        if (cancelled || !history.sessions?.length) return;
        const sessions = history.sessions.map(sessionSummaryToChat);
        const hasUrlContext = location.includes("subjectGroupKey=") || location.includes("unitId=");
        const activeId = sessions[0].id;
        const activeDetail = await getHomeworkChatSession(activeId).catch(() => null);
        const hydratedSessions = activeDetail
          ? sessions.map((s) => (s.id === activeId ? sessionDetailToChat(activeDetail.session) : s))
          : sessions;
        if (cancelled) return;
        setAppState((prev) => ({
          sessions: hasUrlContext
            ? [
                ...prev.sessions,
                ...hydratedSessions.filter(
                  (session) => !prev.sessions.some((existing) => existing.id === session.id)
                ),
              ]
            : hydratedSessions,
          activeId: hasUrlContext
            ? prev.activeId
            : hydratedSessions.some((s) => s.id === prev.activeId)
            ? prev.activeId
            : activeId,
        }));
      } catch (error) {
        console.warn("Failed to load homework chat history", error);
      }
    }
    void loadHomeworkHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── State Mutators ────────────────────────────────────────
  const patchActive = useCallback((fn: (s: ChatSession) => ChatSession) => {
    setAppState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s.id === prev.activeId ? fn(s) : s)),
    }));
  }, []);

  const startNewChat = useCallback((overrides?: Partial<ChatSession>) => {
    const s = mkSession();
    if (overrides) Object.assign(s, overrides);
    setAppState((prev) => ({ sessions: [s, ...prev.sessions], activeId: s.id }));
    setInput("");
    setPendingFiles([]);
    setSidebarOpen(false);
  }, []);

  const openSession = useCallback(async (id: string) => {
    setAppState((prev) => ({ ...prev, activeId: id }));
    setView("chat");
    setSidebarOpen(false);
    try {
      const detail = await getHomeworkChatSession(id);
      const loaded = sessionDetailToChat(detail.session);
      setAppState((prev) => ({
        ...prev,
        activeId: loaded.id,
        sessions: prev.sessions.map((s) => (s.id === loaded.id ? loaded : s)),
      }));
    } catch (error) {
      console.warn("Failed to load homework chat session", error);
    }
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

  const clearCurrentChat = useCallback(() => {
    patchActive((s) => ({ ...s, messages: [], title: "New chat", updatedAt: new Date().toISOString() }));
    setSidebarOpen(false);
  }, [patchActive]);

  const selectSubjectGroup = useCallback(
    (subjectGroupKey: string) => {
      const subjectGroup = subjectCatalog.find((item) => item.subjectGroupKey === subjectGroupKey);
      patchActive((session) => ({
        ...session,
        subjectGroupKey: subjectGroup?.subjectGroupKey || null,
        subject: subjectGroup?.subject || "",
        unitId: null,
        unitTitle: null,
        unitNumber: null,
        board: subjectGroup?.board || null,
        classNumber: subjectGroup?.standard || null,
        term: subjectGroup?.term || null,
        topicId: null,
        topicLabel: null,
        homeworkId: session.messages.length ? session.homeworkId : undefined,
      }));
    },
    [patchActive, subjectCatalog]
  );

  const selectUnit = useCallback(
    (unitId: string) => {
      const unit = availableUnits.find((item) => item.id === unitId);
      patchActive((session) => ({
        ...session,
        subject: unit?.subject || activeSubjectGroup?.subject || session.subject,
        unitId: unit?.id || null,
        unitTitle: unit ? getLibraryUnitDisplayLabel(unit) : null,
        unitNumber: unit?.unitNumber ?? null,
        board: unit?.board || activeSubjectGroup?.board || session.board || null,
        classNumber: unit?.standard || activeSubjectGroup?.standard || session.classNumber || null,
        term: unit?.term || activeSubjectGroup?.term || null,
        topicId: null,
        topicLabel: null,
      }));
    },
    [activeSubjectGroup, availableUnits, patchActive]
  );

  // ── File Handling ─────────────────────────────────────────
  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const imageFile = Array.from(files).find((file) => file.type.startsWith("image/"));
      if (!imageFile) {
        const aiMsg: Message = {
          id: uid(),
          role: "assistant",
          content: "Only image attachments are supported right now.",
          createdAt: new Date().toISOString(),
          animate: true,
        };
        patchActive((session) => ({
          ...session,
          messages: [...session.messages, aiMsg],
          updatedAt: new Date().toISOString(),
        }));
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

      const previewUrl = URL.createObjectURL(imageFile);
      const base64 = await fileToBase64(imageFile);
      const item: AttachmentItem = {
        id: uid(),
        name: imageFile.name,
        size: imageFile.size,
        kind: "image",
        previewUrl,
        base64,
      };
      setPendingFiles((prev) => {
        prev.forEach((file) => {
          if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
        });
        return [item];
      });
      if (fileRef.current) fileRef.current.value = "";
    },
    [patchActive]
  );

  const removeFile = useCallback((id: string) => {
    setPendingFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  // ── Copy ──────────────────────────────────────────────────
  const copyMessage = useCallback(
    async (id: string) => {
      const msg = active?.messages.find((m) => m.id === id);
      if (!msg) return;
      await navigator.clipboard.writeText(msg.content).catch(() => {});
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1400);
    },
    [active]
  );

  // ── Send ──────────────────────────────────────────────────
  const send = useCallback(
    async (overrideText?: string, overrideFiles?: AttachmentItem[]) => {
      if (!active || loading) return;
      const content = overrideText ?? input.trim();
      const attachments = overrideFiles ?? pendingFiles;
      if (!content && !attachments.length) return;
      if (!active.homeworkId && !hasRequiredContext) {
        const aiMsg: Message = {
          id: uid(),
          role: "assistant",
          content: "Please select a Subject and Unit from the left sidebar first, then send your homework question.",
          createdAt: new Date().toISOString(),
          animate: true,
        };
        patchActive((session) => ({
          ...session,
          messages: [...session.messages, aiMsg],
          updatedAt: new Date().toISOString(),
        }));
        return;
      }

      const userMsg: Message = {
        id: uid(),
        role: "user",
        content,
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

      try {
        const imageBase64 = attachments[0]?.base64 || null;
        const result = await sendHomeworkChat({
          homeworkId: active.homeworkId || "new",
          message: content,
          imageBase64,
          subjectGroupKey: active.subjectGroupKey || null,
          unitId: active.unitId || null,
          unitTitle: active.unitTitle || null,
          subject: active.subject || null,
          unitNumber: active.unitNumber || null,
          board: active.board || null,
          classNumber: active.classNumber || null,
          term: active.term || null,
        });
        const aiMsg: Message = {
          id: uid(),
          role: "assistant",
          content: result.response || "Let's keep working through this step by step.",
          createdAt: new Date().toISOString(),
          animate: true,
        };
        setAppState((prev) => ({
          ...prev,
          activeId: result.homework_id || prev.activeId,
          sessions: prev.sessions.map((s) => {
            if (s.id !== prev.activeId) return s;
            return {
              ...s,
              id: result.homework_id || s.id,
              homeworkId: result.homework_id || s.homeworkId,
              messages: [...s.messages, aiMsg],
              updatedAt: new Date().toISOString(),
              status: result.status,
              currentQuestion: result.current_question,
              currentQuestionIndex: result.current_question_index,
              totalQuestions: result.total_questions,
            };
          }),
        }));
      } catch (error) {
        const aiMsg: Message = {
          id: uid(),
          role: "assistant",
          content:
            error instanceof Error
              ? `I couldn't reach the homework helper: ${error.message}`
              : "I couldn't reach the homework helper. Please try again.",
          createdAt: new Date().toISOString(),
          animate: true,
        };
        setAppState((prev) => ({
          ...prev,
          sessions: prev.sessions.map((s) =>
            s.id !== prev.activeId
              ? s
              : { ...s, messages: [...s.messages, aiMsg], updatedAt: new Date().toISOString() }
          ),
        }));
      } finally {
        setLoading(false);
      }
    },
    [active, hasRequiredContext, input, loading, patchActive, pendingFiles]
  );

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
      <div className="hh-root">
        <div className="sd-bg-spark s1" />
        <div className="sd-bg-spark s2" />
        <div className="sd-bg-spark s3" />
        <div className="sd-bg-ribbon" />
        <Navigation currentRole={(user?.role as "student" | "teacher") || "student"} onRoleChange={() => {}} />
        <HistoryView
          sessions={appState.sessions}
          activeId={appState.activeId}
          onOpen={(id) => {
            openSession(id);
            setView("chat");
          }}
          onDelete={deleteSession}
          onNew={() => {
            startNewChat();
            setView("chat");
          }}
          onBack={() => setView("chat")}
          bp={bp}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // MAIN CHAT LAYOUT
  // ─────────────────────────────────────────────────────────
  const showSidebarInline = bp.desktop;
  const headerH = 58;

  const currentStarters = STARTERS[normalizeSubject(active?.subject)];

  return (
    <div className="hh-root">
      {/* Background ambient sparkles and ribbon wave */}
      <div className="sd-bg-spark s1" />
      <div className="sd-bg-spark s2" />
      <div className="sd-bg-spark s3" />
      <div className="sd-bg-ribbon" />

      {/* Global Top Navbar */}
      <Navigation currentRole={(user?.role as "student" | "teacher") || "student"} onRoleChange={() => {}} />

      {/* Mobile drawer scrim */}
      {!showSidebarInline && sidebarOpen && (
        <div className="gu-scrim" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ───── SUB-HEADER ───── */}
      <header
        style={{
          flexShrink: 0,
          height: headerH,
          display: "flex",
          alignItems: "center",
          padding: bp.mobile ? "0 12px" : "0 22px",
          gap: bp.mobile ? 8 : 14,
          background: "var(--sd-card)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1px solid var(--sd-line)",
          boxShadow: "var(--sd-shadow-soft)",
          zIndex: 40,
          position: "relative",
        }}
      >
        {/* Mobile toggle button */}
        {!showSidebarInline && (
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1px solid var(--sd-line)",
              background: "var(--sd-card-soft)",
              color: "var(--sd-ink)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        )}

        {/* Brand & Assistant Info */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              boxShadow: "0 6px 14px rgba(37,99,235,.3)",
              animation: "sdPop3d 4.5s ease-in-out infinite",
            }}
          >
            <Sparkles size={18} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: "var(--sd-ink)", letterSpacing: "-.01em" }}>
              Homework Helper AI
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sd-muted)", display: "flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 6px #10b981",
                  display: "inline-block",
                }}
              />
              {active?.unitTitle ? `${active.subject} • ${active.unitTitle}` : "Interactive Study Assistant"}
            </span>
          </div>
        </div>

        {/* Context Selector: Subject & Unit (Desktop & Tablet) */}
        {!bp.mobile && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "3px 8px 3px 12px",
              borderRadius: 14,
              background: "var(--sd-card-soft)",
              border: hasRequiredContext
                ? "1px solid var(--sd-line)"
                : "1px solid rgba(245,158,11,.45)",
              boxShadow: hasRequiredContext
                ? "0 1px 4px rgba(0,0,0,.04)"
                : "0 0 12px rgba(245,158,11,.15)",
              marginLeft: bp.wide ? 16 : 8,
              maxWidth: bp.wide ? 560 : 440,
              flexShrink: 1,
              transition: "all .2s ease",
            }}
          >
            {/* Subject Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, position: "relative", minWidth: 0, flex: "1 1 auto" }}>
              <BookOpen size={14} style={{ color: subj.color, flexShrink: 0 }} />
              <select
                value={active?.subjectGroupKey || ""}
                onChange={(event) => selectSubjectGroup(event.target.value)}
                disabled={subjectsLoading || loading}
                style={{
                  width: "100%",
                  maxWidth: bp.wide ? 190 : 140,
                  height: 32,
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "var(--sd-ink)",
                  font: "700 12px 'Plus Jakarta Sans', system-ui",
                  padding: "0 18px 0 2px",
                  outline: "none",
                  appearance: "none",
                  cursor: "pointer",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
                title="Select Subject"
              >
                <option value="">{subjectsLoading ? "Loading..." : "Select Subject"}</option>
                {subjectCatalog.map((subject) => (
                  <option key={subject.subjectGroupKey} value={subject.subjectGroupKey}>
                    {subject.title || subject.subject}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                style={{
                  position: "absolute",
                  right: 2,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "var(--sd-muted)",
                }}
              />
            </div>

            {/* Divider */}
            <span style={{ color: "var(--sd-line)", fontWeight: 300, userSelect: "none" }}>/</span>

            {/* Unit Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, position: "relative", minWidth: 0, flex: "1 1 auto" }}>
              <BookMarked size={14} style={{ color: active?.unitId ? "var(--sd-accent)" : "var(--sd-muted)", flexShrink: 0 }} />
              <select
                value={active?.unitId || ""}
                onChange={(event) => selectUnit(event.target.value)}
                disabled={!active?.subjectGroupKey || loading}
                style={{
                  width: "100%",
                  maxWidth: bp.wide ? 220 : 160,
                  height: 32,
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: !active?.subjectGroupKey ? "var(--sd-muted)" : "var(--sd-ink)",
                  font: "600 12px 'Plus Jakarta Sans', system-ui",
                  padding: "0 18px 0 2px",
                  outline: "none",
                  appearance: "none",
                  cursor: !active?.subjectGroupKey ? "not-allowed" : "pointer",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
                title="Select Unit / Chapter"
              >
                <option value="">
                  {!active?.subjectGroupKey ? "Select Subject First" : "Select Chapter"}
                </option>
                {availableUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {getLibraryUnitDisplayLabel(unit)}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                style={{
                  position: "absolute",
                  right: 2,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "var(--sd-muted)",
                }}
              />
            </div>

            {/* Status indicator */}
            {hasRequiredContext ? (
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 6px #10b981",
                  flexShrink: 0,
                  marginLeft: 2,
                  marginRight: 4,
                }}
                title="Ready to answer homework questions"
              />
            ) : (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#f59e0b",
                  background: "rgba(245,158,11,.14)",
                  padding: "2px 7px",
                  borderRadius: 6,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                Required
              </span>
            )}
          </div>
        )}

        {/* Right Action Icons */}
        <div style={{ display: "flex", alignItems: "center", gap: bp.mobile ? 6 : 8, marginLeft: "auto", flexShrink: 0 }}>
          <button
            onClick={() => setView("history")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 34,
              padding: bp.mobile ? "0 10px" : "0 13px",
              borderRadius: 10,
              border: "1px solid var(--sd-line)",
              background: "var(--sd-card-soft)",
              color: "var(--sd-ink)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all .18s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.borderColor = "var(--sd-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.borderColor = "var(--sd-line)";
            }}
            title="View chat history"
          >
            <History size={14} style={{ color: "var(--sd-accent)" }} />
            <span className="hide-mobile">History</span>
            <span
              style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 999,
                background: "rgba(37,99,235,.14)",
                color: "var(--sd-accent)",
              }}
            >
              {appState.sessions.length}
            </span>
          </button>

          <button
            onClick={exportChat}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: "1px solid var(--sd-line)",
              background: "var(--sd-card-soft)",
              color: "var(--sd-ink)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              transition: "all .18s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.borderColor = "var(--sd-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.borderColor = "var(--sd-line)";
            }}
            title="Export conversation"
          >
            <Download size={15} />
          </button>

          <button
            onClick={clearCurrentChat}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: "1px solid var(--sd-line)",
              background: "var(--sd-card-soft)",
              color: "#ef4444",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              transition: "all .18s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.background = "rgba(239,68,68,.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.background = "var(--sd-card-soft)";
            }}
            title="Clear current messages"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </header>

      {/* Mobile Subject & Unit Selector Strip */}
      {bp.mobile && (
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: "var(--sd-card)",
            borderBottom: "1px solid var(--sd-line)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            zIndex: 35,
          }}
        >
          {/* Mobile Subject Dropdown */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "0 8px",
              height: 34,
              borderRadius: 9,
              background: "var(--sd-card-soft)",
              border: "1px solid var(--sd-line)",
              position: "relative",
            }}
          >
            <BookOpen size={13} style={{ color: subj.color, flexShrink: 0 }} />
            <select
              value={active?.subjectGroupKey || ""}
              onChange={(event) => selectSubjectGroup(event.target.value)}
              disabled={subjectsLoading || loading}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                background: "transparent",
                color: "var(--sd-ink)",
                font: "700 11.5px 'Plus Jakarta Sans', system-ui",
                padding: "0 16px 0 0",
                outline: "none",
                appearance: "none",
                cursor: "pointer",
              }}
            >
              <option value="">{subjectsLoading ? "Loading..." : "Subject..."}</option>
              {subjectCatalog.map((subject) => (
                <option key={subject.subjectGroupKey} value={subject.subjectGroupKey}>
                  {subject.title || subject.subject}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "var(--sd-muted)",
              }}
            />
          </div>

          {/* Mobile Unit Dropdown */}
          <div
            style={{
              flex: 1.2,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "0 8px",
              height: 34,
              borderRadius: 9,
              background: "var(--sd-card-soft)",
              border: "1px solid var(--sd-line)",
              position: "relative",
            }}
          >
            <BookMarked size={13} style={{ color: active?.unitId ? "var(--sd-accent)" : "var(--sd-muted)", flexShrink: 0 }} />
            <select
              value={active?.unitId || ""}
              onChange={(event) => selectUnit(event.target.value)}
              disabled={!active?.subjectGroupKey || loading}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                background: "transparent",
                color: !active?.subjectGroupKey ? "var(--sd-muted)" : "var(--sd-ink)",
                font: "600 11.5px 'Plus Jakarta Sans', system-ui",
                padding: "0 16px 0 0",
                outline: "none",
                appearance: "none",
                cursor: !active?.subjectGroupKey ? "not-allowed" : "pointer",
              }}
            >
              <option value="">
                {!active?.subjectGroupKey ? "Select Subject First" : "Chapter..."}
              </option>
              {availableUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {getLibraryUnitDisplayLabel(unit)}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "var(--sd-muted)",
              }}
            />
          </div>

          {!hasRequiredContext && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#f59e0b",
                background: "rgba(245,158,11,.14)",
                padding: "4px 6px",
                borderRadius: 6,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              Required
            </span>
          )}
        </div>
      )}

      {/* ───── BODY CONTENT (SIDEBAR + MAIN CHAT) ───── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", position: "relative", zIndex: 1 }}>
        {/* ───── SIDEBAR ───── */}
        <aside
          style={
            showSidebarInline
              ? {
                  width: bp.wide ? 280 : 255,
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--sd-card)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  borderRight: "1px solid var(--sd-line)",
                  overflow: "hidden",
                }
              : {
                  position: "fixed",
                  top: headerH + 60,
                  left: 0,
                  bottom: 0,
                  width: 270,
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--sd-card-solid)",
                  borderRight: "1px solid var(--sd-line)",
                  overflow: "hidden",
                  boxShadow: "var(--sd-shadow)",
                  zIndex: 50,
                  transform: sidebarOpen ? "translateX(0)" : "translateX(-110%)",
                  transition: "transform .25s cubic-bezier(.4, 0, .2, 1)",
                }
          }
        >
          {/* New Chat Primary Action Button */}
          <div style={{ padding: "14px 14px 10px", flexShrink: 0 }}>
            <button
              onClick={() => startNewChat()}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                width: "100%",
                height: 42,
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, #2563eb, #7c3aed 52%, #0ea5e9)",
                backgroundSize: "180% 180%",
                color: "#fff",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(37,99,235,.28)",
                transition: "transform .18s, box-shadow .18s",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 12px 26px rgba(37,99,235,.38)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(37,99,235,.28)";
              }}
            >
              <Plus size={17} />
              New Conversation
            </button>
          </div>

          <div style={{ height: 1, background: "var(--sd-line)", margin: "0 14px 8px" }} />

          {/* Section Header: Chat History */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              color: "var(--sd-muted)",
              padding: "4px 14px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <History size={13} style={{ color: "var(--sd-accent)" }} />
              Chat History
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: "1px 7px",
                borderRadius: 999,
                background: "rgba(37,99,235,.12)",
                color: "var(--sd-accent)",
              }}
            >
              {appState.sessions.length}
            </span>
          </div>

          {/* Scrollable chat history list taking FULL REMAINING HEIGHT */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 8px 14px" }}>
            {appState.sessions.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "28px 16px", color: "var(--sd-muted)" }}>
                <MessageSquare size={26} />
                <p style={{ fontSize: 12, textAlign: "center", fontWeight: 600 }}>No conversations yet</p>
              </div>
            ) : (
              appState.sessions.map((s) => {
                const sub = getSubjectConfig(s.subject);
                const isA = s.id === appState.activeId;
                return (
                  <button
                    key={s.id}
                    onClick={() => openSession(s.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "8px 10px",
                      borderRadius: 11,
                      border: isA ? "1px solid rgba(37,99,235,.35)" : "1px solid transparent",
                      cursor: "pointer",
                      background: isA
                        ? "linear-gradient(90deg, rgba(37,99,235,.14), rgba(124,58,237,.06))"
                        : "transparent",
                      color: isA ? "var(--sd-accent)" : "var(--sd-ink)",
                      textAlign: "left",
                      width: "100%",
                      marginBottom: 3,
                      transition: "all .16s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isA) {
                        e.currentTarget.style.background = "var(--sd-card-soft)";
                        e.currentTarget.style.transform = "translateX(3px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isA) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.transform = "none";
                      }
                    }}
                  >
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        background: sub.bg,
                        color: sub.color,
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                        boxShadow: "0 2px 6px rgba(0,0,0,.06)",
                      }}
                    >
                      {sub.icon}
                    </span>

                    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: 12.5,
                          fontWeight: isA ? 800 : 600,
                        }}
                      >
                        {s.title}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--sd-muted)", fontWeight: 600 }}>
                        {s.messages.length} msgs · {relTime(s.updatedAt)}
                      </span>
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(s.id);
                      }}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: "none",
                        background: "transparent",
                        color: "var(--sd-muted)",
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                        opacity: isA ? 0.8 : 0,
                        transition: "opacity .15s, color .15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.color = "#ef4444";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--sd-muted)";
                        if (!isA) e.currentTarget.style.opacity = "0";
                      }}
                    >
                      <X size={12} />
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
              /* Playful Dashboard-Inspired Empty State */
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "65vh",
                  maxWidth: 820,
                  margin: "0 auto",
                  padding: bp.mobile ? "20px 8px" : "36px 16px",
                  gap: 22,
                }}
              >
                {/* Hero Showcase Card */}
                <div
                  className="hh-card"
                  style={{
                    width: "100%",
                    padding: bp.mobile ? "20px 16px" : "28px 32px",
                    display: "grid",
                    gridTemplateColumns: bp.mobile ? "1fr" : "1fr 140px",
                    gap: 16,
                    alignItems: "center",
                    background: isDark
                      ? "linear-gradient(135deg, rgba(23,31,58,.94) 0%, rgba(16,23,45,.88) 55%, rgba(32,45,82,.88) 100%)"
                      : "linear-gradient(135deg, #eef8ff 0%, #efffed 52%, #fff5d7 100%)",
                    borderColor: isDark ? "rgba(56,189,248,.25)" : "rgba(37,99,235,.18)",
                    boxShadow: "var(--sd-shadow)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "4px 12px",
                        borderRadius: 999,
                        background: "rgba(37,99,235,.12)",
                        color: "var(--sd-accent)",
                        fontSize: 11.5,
                        fontWeight: 800,
                        marginBottom: 10,
                      }}
                    >
                      <Sparkles size={13} />
                      AI Homework Companion
                    </div>
                    <h2
                      style={{
                        fontSize: bp.mobile ? 22 : 28,
                        fontWeight: 900,
                        letterSpacing: "-.02em",
                        color: "var(--sd-ink)",
                        margin: "0 0 8px",
                        lineHeight: 1.2,
                      }}
                    >
                      How can I help with homework today?
                    </h2>
                    <p
                      style={{
                        fontSize: 13.5,
                        lineHeight: 1.6,
                        color: "var(--sd-muted)",
                        fontWeight: 600,
                        margin: 0,
                        maxWidth: 500,
                      }}
                    >
                      Ask step-by-step questions, upload textbook photos, or choose a starter below to begin your study session.
                    </p>

                    {active?.unitTitle ? (
                      <div
                        style={{
                          marginTop: 14,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 14px",
                          borderRadius: 10,
                          background: "var(--sd-card)",
                          border: "1px solid var(--sd-line)",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--sd-ink)",
                          boxShadow: "0 2px 6px rgba(0,0,0,.04)",
                        }}
                      >
                        <span style={{ color: "#10b981" }}>✓</span>
                        Active Context: <b>{active.subject} • {active.unitTitle}</b>
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: 14,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 14px",
                          borderRadius: 10,
                          background: "rgba(245,158,11,.12)",
                          border: "1px solid rgba(245,158,11,.25)",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#f59e0b",
                        }}
                      >
                        <span>💡</span>
                        <span>Select your <b>Subject & Chapter</b> in the top bar to begin your study session.</span>
                      </div>
                    )}
                  </div>

                  {/* Mascot Visual */}
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <img
                      src={studyRobo}
                      alt="AI Study Robot"
                      style={{
                        width: bp.mobile ? 90 : 130,
                        height: bp.mobile ? 90 : 130,
                        objectFit: "contain",
                        filter: "drop-shadow(0 14px 18px rgba(0,0,0,.22))",
                        animation: "sdBreathe 4.5s ease-in-out infinite",
                      }}
                    />
                  </div>
                </div>

                {/* Starter Prompts Title */}
                <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--sd-muted)" }}>
                    Recommended Starters
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sd-faint)" }}>
                    Tap to ask immediately
                  </span>
                </div>

                {/* Starter Prompts Grid */}
                <div
                  style={{
                    width: "100%",
                    display: "grid",
                    gridTemplateColumns: bp.mobile ? "1fr" : "repeat(3, 1fr)",
                    gap: 12,
                  }}
                >
                  {currentStarters.map((starter) => (
                    <button
                      key={starter.title}
                      onClick={() => setInput(starter.title)}
                      className="hh-card"
                      style={{
                        padding: 16,
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        border: "1px solid var(--sd-line)",
                        background: "var(--sd-card)",
                        minHeight: 110,
                        position: "relative",
                        overflow: "hidden",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px) scale(1.015)";
                        e.currentTarget.style.borderColor = starter.color;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.borderColor = "var(--sd-line)";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 12,
                            display: "grid",
                            placeItems: "center",
                            fontSize: 18,
                            background: "var(--sd-card-soft)",
                            border: "1px solid var(--sd-line)",
                            boxShadow: "0 4px 10px rgba(0,0,0,.06)",
                            animation: "sdPop3d 4s ease-in-out infinite",
                          }}
                        >
                          {starter.icon}
                        </span>
                        <ArrowRight size={14} style={{ color: "var(--sd-muted)" }} />
                      </div>
                      <div style={{ marginTop: 2 }}>
                        <strong style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: "var(--sd-ink)", marginBottom: 3 }}>
                          {starter.title}
                        </strong>
                        <small style={{ fontSize: 11, fontWeight: 600, color: "var(--sd-muted)", lineHeight: 1.4, display: "block" }}>
                          {starter.desc}
                        </small>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              active.messages.map((m) =>
                m.role === "user" ? (
                  /* User Bubble */
                  <article
                    key={m.id}
                    className="gu-msgin"
                    style={{
                      display: "flex",
                      flexDirection: "row-reverse",
                      gap: 12,
                      marginBottom: 22,
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "12px 4px 12px 12px",
                        background: "var(--sd-card-soft)",
                        border: "1px solid var(--sd-line)",
                        display: "grid",
                        placeItems: "center",
                        color: "var(--sd-ink)",
                        fontSize: 11.5,
                        fontWeight: 800,
                        flexShrink: 0,
                        boxShadow: "0 4px 10px rgba(0,0,0,.06)",
                      }}
                    >
                      You
                    </div>
                    <div
                      style={{
                        maxWidth: `min(720px, ${bp.mobile ? "calc(100vw - 84px)" : "80%"})`,
                        background: "var(--sd-bubble-user)",
                        color: "#fff",
                        borderRadius: "18px 4px 18px 18px",
                        padding: "14px 18px",
                        fontSize: 13.5,
                        lineHeight: 1.72,
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                        boxShadow: "0 8px 22px rgba(37,99,235,.28)",
                      }}
                    >
                      {m.attachments?.length ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: m.content ? 10 : 0 }}>
                          {m.attachments.map((f) => (
                            <FileChip key={f.id} file={f} dark large />
                          ))}
                        </div>
                      ) : null}
                      {m.content}
                    </div>
                  </article>
                ) : (
                  /* AI Bubble */
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

            {loading && <LoadingBubble />}
            <div ref={endRef} />
          </div>

          {/* ───── COMPOSER DOCK ───── */}
          <div
            style={{
              flexShrink: 0,
              padding: bp.mobile ? "10px 12px 14px" : "12px 24px 18px",
              borderTop: "1px solid var(--sd-line)",
              background: "var(--sd-card)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 -4px 20px rgba(0,0,0,.04)",
            }}
          >
            {/* Pending Attachment preview */}
            {pendingFiles.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  maxWidth: bp.wide ? 960 : "100%",
                  margin: "0 auto 10px",
                }}
              >
                {pendingFiles.map((f) => (
                  <FileChip key={f.id} file={f} removable onRemove={() => removeFile(f.id)} />
                ))}
              </div>
            )}

            {/* Input Row */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
                background: "var(--sd-card-soft)",
                border: "1.5px solid var(--sd-line)",
                borderRadius: 18,
                padding: "8px 10px",
                maxWidth: bp.wide ? 960 : "100%",
                margin: "0 auto",
                boxShadow: "inset 0 1px 3px rgba(0,0,0,.03)",
                transition: "border-color .18s, box-shadow .18s",
              }}
              onFocusCapture={(e) => {
                e.currentTarget.style.borderColor = "var(--sd-accent)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,.15)";
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = "var(--sd-line)";
                e.currentTarget.style.boxShadow = "inset 0 1px 3px rgba(0,0,0,.03)";
              }}
            >
              <input
                ref={fileRef}
                type="file"
                style={{ display: "none" }}
                accept="image/*"
                onChange={(e) => void handleFiles(e.target.files)}
              />

              {/* Attach button */}
              <button
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  border: "1px solid var(--sd-line)",
                  background: "var(--sd-card)",
                  color: "var(--sd-ink)",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all .16s ease",
                }}
                onClick={() => fileRef.current?.click()}
                title="Attach question image"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.borderColor = "var(--sd-accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.borderColor = "var(--sd-line)";
                }}
              >
                <Paperclip size={17} />
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
                placeholder={
                  !hasRequiredContext && !active?.homeworkId
                    ? "Select a subject & unit on the left to begin..."
                    : `Ask any question about ${active?.unitTitle || active?.subject || "homework"}…`
                }
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  font: "14px/1.6 'Plus Jakarta Sans', system-ui, sans-serif",
                  color: "var(--sd-ink)",
                  resize: "none",
                  minHeight: 36,
                  maxHeight: 150,
                  padding: "6px 6px",
                }}
              />

              {/* Voice button */}
              <button
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  border: `1px solid ${listening ? "#ef4444" : "var(--sd-line)"}`,
                  background: listening ? "rgba(239,68,68,.16)" : "var(--sd-card)",
                  color: listening ? "#ef4444" : "var(--sd-ink)",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all .16s ease",
                  animation: listening ? "sdPulseSoft 1.6s infinite" : "none",
                }}
                onClick={toggleVoice}
                title={listening ? "Stop voice recording" : "Speak question"}
                onMouseEnter={(e) => {
                  if (!listening) e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  if (!listening) e.currentTarget.style.transform = "none";
                }}
              >
                {listening ? <MicOff size={17} /> : <Mic size={17} />}
              </button>

              {/* Send button */}
              <button
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  border: "none",
                  background:
                    loading ||
                    (!input.trim() && !pendingFiles.length) ||
                    (!active?.homeworkId && !hasRequiredContext)
                      ? "var(--sd-faint)"
                      : "linear-gradient(135deg, #2563eb, #7c3aed)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  cursor:
                    loading ||
                    (!input.trim() && !pendingFiles.length) ||
                    (!active?.homeworkId && !hasRequiredContext)
                      ? "not-allowed"
                      : "pointer",
                  flexShrink: 0,
                  boxShadow:
                    loading ||
                    (!input.trim() && !pendingFiles.length) ||
                    (!active?.homeworkId && !hasRequiredContext)
                      ? "none"
                      : "0 6px 16px rgba(37,99,235,.35)",
                  transition: "all .16s ease",
                }}
                onClick={() => void send()}
                disabled={
                  loading ||
                  (!input.trim() && !pendingFiles.length) ||
                  (!active?.homeworkId && !hasRequiredContext)
                }
                title="Send homework question"
                onMouseEnter={(e) => {
                  if (!loading && (input.trim() || pendingFiles.length) && (active?.homeworkId || hasRequiredContext)) {
                    e.currentTarget.style.transform = "translateY(-1px) scale(1.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                }}
              >
                {loading ? <Loader2 size={17} className="gu-spin" /> : <Send size={16} />}
              </button>
            </div>

            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--sd-muted)",
                textAlign: "center",
                maxWidth: bp.wide ? 960 : "100%",
                margin: "8px auto 0",
              }}
            >
              Supports image attachments · Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
