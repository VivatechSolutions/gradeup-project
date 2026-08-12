import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import jsPDF from "jspdf";

/* ============================================================================================
   MOCK API LAYER
   --------------------------------------------------------------------------------------------
   Every function below mirrors the exact name + argument shape your real backend client
   (e.g. `lib/gradeupApi`) will eventually export. Nothing else in this file needs to change
   when you wire up the real backend — just delete this block and restore the real import:

       import { startSeminar, endSeminarWithTranscript, ... } from "../lib/gradeupApi";

   Each function has a `🔌 BACKEND:` comment showing exactly what REST call it stands in for.
   Data is persisted to localStorage so the History screen, live rooms, etc. all behave
   consistently across reloads without needing a server.
   ============================================================================================ */

const LS_HISTORY  = "teacherarena_seminar_history_v1";
const LS_SESSIONS = "teacherarena_live_sessions_v1";
const LS_SUBJECTS = "teacherarena_subject_catalog_v1";

const delay = (ms = 550) => new Promise((res) => setTimeout(res, ms));
const uid = (prefix = "id") => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function writeLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const SEED_SUBJECTS = [
  { subjectGroupKey: "cs", title: "Computer Science", units: [
    { id: "cs-u1", unitTitle: "Data Structures", unitNumber: 1, sectionTopics: [{ label: "Should AI replace human teachers?" }, { label: "Ethics of automated grading" }] },
    { id: "cs-u2", unitTitle: "Algorithms", unitNumber: 2, sectionTopics: [{ label: "Is P = NP solvable in our lifetime?" }] },
    { id: "cs-u3", unitTitle: "Web Development", unitNumber: 3, sectionTopics: [{ label: "Should coding be mandatory in schools?" }] },
  ]},
  { subjectGroupKey: "math", title: "Mathematics", units: [
    { id: "math-u1", unitTitle: "Calculus", unitNumber: 1, sectionTopics: [{ label: "Why calculus matters beyond the classroom" }] },
    { id: "math-u2", unitTitle: "Statistics", unitNumber: 2, sectionTopics: [{ label: "Should statistics be mandatory in schools?" }] },
  ]},
  { subjectGroupKey: "bio", title: "Biology", units: [
    { id: "bio-u1", unitTitle: "Genetics", unitNumber: 1, sectionTopics: [{ label: "Should gene editing in humans be allowed?" }] },
    { id: "bio-u2", unitTitle: "Ecology", unitNumber: 2, sectionTopics: [{ label: "Is nuclear energy the answer to climate change?" }] },
  ]},
  { subjectGroupKey: "phy", title: "Physics", units: [
    { id: "phy-u1", unitTitle: "Mechanics", unitNumber: 1, sectionTopics: [{ label: "Is space exploration worth the cost?" }] },
  ]},
  { subjectGroupKey: "eng", title: "English / Literature", units: [
    { id: "eng-u1", unitTitle: "Poetry", unitNumber: 1, sectionTopics: [{ label: "Is social media harmful to how students communicate?" }] },
  ]},
];

const SEED_HISTORY = [
  { id: uid("hist"), topic: "Should AI replace human teachers?", subject: "Computer Science", unit: "Data Structures", date: "2026-06-24", time: "10:00 AM", duration: "18:42", students: 24, status: "completed", score: 88 },
  { id: uid("hist"), topic: "Is space exploration worth the cost?", subject: "Physics", unit: "Mechanics", date: "2026-06-20", time: "02:30 PM", duration: "22:10", students: 31, status: "completed", score: 91 },
  { id: uid("hist"), topic: "Should gene editing in humans be allowed?", subject: "Biology", unit: "Genetics", date: "2026-06-14", time: "09:15 AM", duration: "15:03", students: 19, status: "completed", score: 76 },
  { id: uid("hist"), topic: "Should coding be mandatory in schools?", subject: "Computer Science", unit: "Web Development", date: "2026-07-04", time: "11:00 AM", duration: "—", students: 0, status: "scheduled" },
];

function ensureSeed() {
  if (!localStorage.getItem(LS_SUBJECTS)) writeLS(LS_SUBJECTS, SEED_SUBJECTS);
  if (!localStorage.getItem(LS_HISTORY)) writeLS(LS_HISTORY, SEED_HISTORY);
  if (!localStorage.getItem(LS_SESSIONS)) writeLS(LS_SESSIONS, []);
}
if (typeof window !== "undefined") ensureSeed();

function genRoomLink(id) {
  return `${typeof window !== "undefined" ? window.location.origin : ""}/teacher/seminar/join?room=${id}`;
}

/* ---------------------------- teacher / auth context ---------------------------- */
function getCandidateContext(user) {
  // 🔌 BACKEND: replace with your real auth/profile lookup (req.user / session)
  const id = user?.id || user?.candidateId || readLS("teacherarena_local_id", null) || uid("teacher");
  writeLS("teacherarena_local_id", id);
  const name = `${user?.firstName || "Ms."} ${user?.lastName || "Teacher"}`.trim();
  return { candidateId: id, candidateName: name || "Teacher" };
}

/* ---------------------------- subjects / topics ---------------------------- */
async function getLibrarySubjects() {
  // 🔌 BACKEND: GET /api/v1/library/subjects
  await delay(400);
  return readLS(LS_SUBJECTS, SEED_SUBJECTS);
}
async function getSeminarTopics(subjectKey) {
  // 🔌 BACKEND: GET /api/v1/seminar/topics?subject={subjectKey}
  await delay(300);
  const subjects = readLS(LS_SUBJECTS, SEED_SUBJECTS);
  const subject = subjects.find((s) => s.subjectGroupKey === subjectKey);
  return (subject?.units || []).flatMap((u) => (u.sectionTopics || []).map((t) => ({ topic: t.label, unitId: u.id })));
}

/* ---------------------------- history ---------------------------- */
async function getSeminarHistory() {
  // 🔌 BACKEND: GET /api/v1/seminar/history?teacherId={id}
  await delay(500);
  return readLS(LS_HISTORY, []);
}
function pushHistory(entry) {
  const list = readLS(LS_HISTORY, []);
  writeLS(LS_HISTORY, [entry, ...list]);
}

/* ---------------------------- live sessions ---------------------------- */
async function getActiveSeminarSessions() {
  // 🔌 BACKEND: GET /api/v1/seminar/active
  await delay(350);
  return readLS(LS_SESSIONS, []).filter((s) => s.status === "active" || s.status === "waiting");
}
function saveSession(session) {
  const list = readLS(LS_SESSIONS, []);
  const idx = list.findIndex((s) => s.sessionId === session.sessionId);
  if (idx >= 0) list[idx] = session; else list.unshift(session);
  writeLS(LS_SESSIONS, list);
  return session;
}
function loadSession(sessionId) {
  return readLS(LS_SESSIONS, []).find((s) => s.sessionId === sessionId) || null;
}

async function startSeminar({ unitId, candidateId, candidateName, topic, subject, unitName, mode }) {
  // 🔌 BACKEND: POST /api/v1/seminar/start  (multipart when a file is attached)
  await delay(700);
  const sessionId = uid("sem");
  const greeting = `Welcome! I'm your AI co-teacher for "${topic}"${subject ? ` (${subject}${unitName ? ` · ${unitName}` : ""})` : ""}. Whenever you're ready, start walking through your material and I'll help keep the pace on track.`;
  const session = {
    sessionId, topic, subject, unit: unitName, unitId,
    hostCandidateId: candidateId, hostCandidateName: candidateName,
    status: "waiting", mode, participants: [],
    turns: [{ id: uid("turn"), turnType: "greeting", role: "assistant", message: greeting, createdAt: Date.now() }],
    metadata: { ai_greeting: greeting, speakRequests: [] },
  };
  saveSession(session);
  return { session_id: sessionId, sessionId, ai_greeting: greeting, liveSession: session };
}

async function createSeminarRoom({ sessionId, roomLink, unitId, candidateId, candidateName, topic, subject, unit }) {
  // 🔌 BACKEND: POST /api/v1/seminar/room/create
  await delay(500);
  const id = sessionId || uid("sem");
  const session = { sessionId: id, roomLink, topic, subject, unit, unitId, hostCandidateId: candidateId, hostCandidateName: candidateName, status: "waiting", participants: [], turns: [], metadata: { speakRequests: [] } };
  saveSession(session);
  return { session_id: id, sessionId: id, liveSession: session };
}

async function startSeminarRoom({ sessionId, unitId, candidateId, candidateName, topic }) {
  // 🔌 BACKEND: POST /api/v1/seminar/room/start
  await delay(600);
  const session = loadSession(sessionId) || { sessionId, topic, hostCandidateId: candidateId, hostCandidateName: candidateName, participants: [], turns: [], metadata: { speakRequests: [] } };
  session.status = "active";
  saveSession(session);
  return { liveSession: session };
}

async function joinSeminarSession({ sessionId, candidateId, candidateName, role }) {
  // 🔌 BACKEND: POST /api/v1/seminar/join
  await delay(500);
  let session = loadSession(sessionId);
  if (!session) {
    session = { sessionId, topic: "Live Class Session", subject: "", unit: "", status: "waiting", participants: [], turns: [], metadata: { speakRequests: [] } };
  }
  const existing = session.participants.find((p) => String(p.id) === String(candidateId));
  if (!existing) session.participants.push({ id: candidateId, name: candidateName, isHost: role === "host", status: "joined", lastSeenAt: new Date().toISOString() });
  else existing.lastSeenAt = new Date().toISOString();
  saveSession(session);
  return { liveSession: session, shareLink: session.roomLink || genRoomLink(sessionId), subject: session.subject, unit: session.unit, topic: session.topic };
}

async function getSeminarSession(sessionId) {
  // 🔌 BACKEND: GET /api/v1/seminar/:id
  await delay(220);
  return loadSession(sessionId);
}

async function removeSeminarParticipant({ sessionId, participantId }) {
  // 🔌 BACKEND: POST /api/v1/seminar/participant/remove
  await delay(300);
  const session = loadSession(sessionId);
  if (session) { session.participants = session.participants.filter((p) => String(p.id) !== String(participantId)); saveSession(session); }
  return session;
}

async function requestSeminarSpeakingAccess({ sessionId, candidateId, candidateName }) {
  // 🔌 BACKEND: POST /api/v1/seminar/speak/request
  await delay(300);
  const session = loadSession(sessionId);
  if (session) {
    session.metadata.speakRequests = session.metadata.speakRequests || [];
    session.metadata.speakRequests.push({ participantId: candidateId, participantName: candidateName, status: "pending" });
    saveSession(session);
  }
  return session;
}
async function respondSeminarSpeakingAccess({ sessionId, participantId, participantName, approved }) {
  // 🔌 BACKEND: POST /api/v1/seminar/speak/respond
  await delay(300);
  const session = loadSession(sessionId);
  if (session) {
    session.metadata.speakRequests = (session.metadata.speakRequests || []).filter((r) => r.participantId !== participantId);
    const p = session.participants.find((p) => String(p.id) === String(participantId));
    if (p) p.status = approved ? "approved_to_speak" : "muted";
    saveSession(session);
  }
  return session;
}

async function sendSeminarMessage({ sessionId, candidateName, message, role }) {
  // 🔌 BACKEND: POST /api/v1/seminar/chat/send
  await delay(280);
  const session = loadSession(sessionId);
  if (session) {
    session.turns.push({ id: uid("turn"), turnType: "chat", role: role === "host" ? "host" : "participant", speakerName: candidateName, message, createdAt: Date.now() });
    saveSession(session);
  }
  return session;
}

/* ---------------------------- AI responses (mock) ---------------------------- */
const AI_RESPONSES = {
  outline: `Here is a complete outline for your class session:\n\n1. Opening Hook — start with a bold question or striking statistic\n2. Learning Objective — one clear sentence stating what students should take away\n3. Core Explanation — your main teaching point with a worked example\n4. Second Angle — reinforce with a case study or analogy\n5. Common Misconception — call out where students usually get confused\n6. Check for Understanding — a quick question or prompt to the class\n7. Wrap-Up — restate the objective, assign a follow-up, or open the floor`,
  questions: `Likely student questions to prepare for:\n\n• Can you show a real-world example of this?\n• Why does this method work instead of the alternative?\n• Will this be on the assessment?\n• How does this connect to what we covered last week?\n• What happens if we apply this incorrectly?`,
  examples: `Strong examples and evidence to use:\n\n• Reference a real-world case study students will recognise\n• Use a recent, age-appropriate news event as a contemporary anchor\n• Include a worked problem you solve live, step by step\n• Add a short historical precedent for long-term perspective\n• Use one strong statistic rather than several weak ones`,
  script: `Opening script for your class:\n\n"Good [morning/afternoon] everyone. Today we're covering [topic].\n\nThis matters because [key reason]. Over the next [X] minutes we'll walk through [point 1], [point 2], and [point 3] — then I'll open the floor to questions.\n\nLet's start with a question for you: [pose a thought-provoking question to the class]..."`,
  feedback: `AI Co-Teacher Feedback:\n\n✅ Clear opening — the objective was easy to follow\n✅ Explanations were well-paced and structured\n⚠️ Consider pausing longer after key concepts for questions\n⚠️ Add a stronger closing recap of the main takeaway\n💡 Tip: End with a quick check-for-understanding question\n💡 Tip: Use silence deliberately — it gives students time to process`,
};

function mockAIReply(input = "") {
  const lower = input.toLowerCase();
  if (lower.includes("outline") || lower.includes("structure")) return AI_RESPONSES.outline;
  if (lower.includes("question")) return AI_RESPONSES.questions;
  if (lower.includes("example") || lower.includes("evidence")) return AI_RESPONSES.examples;
  if (lower.includes("script") || lower.includes("opening")) return AI_RESPONSES.script;
  if (lower.includes("feedback") || lower.includes("how am i") || lower.includes("help")) return AI_RESPONSES.feedback;
  if (!input.trim()) return AI_RESPONSES.feedback;
  return "Good point — try grounding that with one concrete, relatable example for your students, then transition into your next section.";
}

function mockScoreSession(transcript = "") {
  const seedLen = Math.max(20, transcript.length);
  const rand = (min, max) => min + Math.floor(((seedLen * 97) % 1000) / 1000 * (max - min));
  const conceptual = rand(18, 29), depth = rand(15, 24), flow = rand(12, 19), engagement = rand(8, 15), hints = rand(0, 4);
  const total = Math.max(0, conceptual + depth + flow + engagement - hints);
  return {
    total_score: total,
    conceptual_understanding: conceptual,
    depth_of_knowledge: depth,
    presentation_flow: flow,
    engagement,
    hints_penalty: hints,
    overall_feedback: "Solid class delivery overall — explanations were clear and well-paced, with room to add a few more real-world examples for your students.",
    strengths: ["Clear structure from introduction to wrap-up", "Good use of pauses to let key points land"],
    improvements: ["Add more interactive check-ins with students", "Slow down slightly during dense technical sections"],
    topics_mastered: ["Core concept explanation"],
    topics_need_work: ["Real-world application examples"],
  };
}

async function respondSeminar({ sessionId, transcript, message }) {
  // 🔌 BACKEND: POST /api/v1/seminar/respond  (send transcript or chat message, get AI reply)
  await delay(900);
  const text = transcript || message || "";
  const reply = mockAIReply(text);
  const session = loadSession(sessionId);
  if (session) {
    if (text) session.turns.push({ id: uid("turn"), turnType: "chat", role: "host", speakerName: session.hostCandidateName, message: text, createdAt: Date.now() });
    session.turns.push({ id: uid("turn"), turnType: "ai_response", role: "assistant", message: reply, createdAt: Date.now() });
    saveSession(session);
  }
  return { ai_response: reply };
}
async function guideSeminar() {
  // 🔌 BACKEND: POST /api/v1/seminar/guide
  await delay(700);
  return { ai_response: mockAIReply("help") };
}
async function startSeminarChat() {
  // 🔌 BACKEND: POST /api/v1/seminar/chat/start
  await delay(450);
  return { ai_response: "I'm ready to walk through your class performance report — ask me anything about pacing, clarity, or student engagement." };
}
async function respondSeminarChat({ message }) {
  // 🔌 BACKEND: POST /api/v1/seminar/chat/respond
  await delay(700);
  return { ai_response: mockAIReply(message) };
}

async function endSeminarWithTranscript({ sessionId, transcript }) {
  // 🔌 BACKEND: POST /api/v1/seminar/end
  await delay(1100);
  const session = loadSession(sessionId) || {};
  session.status = "completed";
  saveSession(session);
  const scores = mockScoreSession(transcript || "");
  pushHistory({
    id: sessionId || uid("hist"),
    topic: session.topic || "Untitled Class Session",
    subject: session.subject || "",
    unit: session.unit || "",
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    duration: "—",
    students: (session.participants || []).filter((p) => !p.isHost).length,
    status: "completed",
    score: scores.total_score,
  });
  return { scores, liveSession: session, topics_covered: [], hints_used: scores.hints_penalty };
}

/* Speech transcription/synthesis — we use the browser's native Web Speech API instead
   (see useSpeechRecognition / useAIVoice below), so these are kept only for signature
   parity with the real backend client. */
async function transcribeDebateAudio() {
  // 🔌 BACKEND: POST /api/v1/speech/transcribe (multipart audio upload)
  await delay(400);
  return { text: "" };
}
async function synthesizeDebateSpeech() {
  // 🔌 BACKEND: POST /api/v1/speech/synthesize
  return null; // null => caller falls back to window.speechSynthesis
}

function getErrorMessage(error, fallback) {
  const raw = error?.message ?? error;
  if (typeof raw === "string" && raw.trim()) return raw;
  return fallback;
}

/* ============================================================================================
   LIGHTWEIGHT STUB HOOKS
   (swap for your real app's useAuth / component library when integrating)
   ============================================================================================ */
function useAuth() {
  const [user] = useState(() => ({ firstName: "Alex", lastName: "Morgan", id: readLS("teacherarena_local_id", null) }));
  return { user };
}

function FormattedAIContent({ content }) {
  const lines = String(content || "").split("\n");
  return (
    <div style={{ lineHeight: 1.7 }}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} style={{ height: 6 }} />;
        if (/^[•\-]\s/.test(trimmed)) return <div key={i} style={{ paddingLeft: 14, position: "relative" }}><span style={{ position: "absolute", left: 0 }}>•</span>{trimmed.replace(/^[•\-]\s/, "")}</div>;
        if (/^\d+\.\s/.test(trimmed)) return <div key={i} style={{ fontWeight: 700, marginTop: 4 }}>{trimmed}</div>;
        return <div key={i}>{trimmed}</div>;
      })}
    </div>
  );
}

/* ============================================================================================
   CSS — visual design kept identical to the student SeminarArena module, plus new classes
   for the History screen (prefixed `hist-`) and a few extra responsive breakpoints.
   ============================================================================================ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden}
:root{
  --bg:#f0f2f5;--surf:#fff;--surf2:#f7f8fa;--surf3:#eef0f4;
  --bdr:rgba(0,0,0,.08);--bdr2:rgba(0,0,0,.14);
  --em:#00c37a;--em2:#00a366;--em3:#d0fff1;
  --sky:#2d9cdb;--sky2:#1a7bbf;
  --vio:#7c3aed;--pnk:#e91e8c;
  --red:#e53e3e;--amb:#f6a623;
  --t1:#0d1117;--t2:#444d5b;--t3:#8a95a3;--t4:#d6dbe4;
  --font:'DM Sans',system-ui,sans-serif;
  --mono:'JetBrains Mono',monospace;
  --sh:0 1px 4px rgba(0,0,0,.06);
  --sh2:0 4px 20px rgba(0,0,0,.1);
  --sh3:0 16px 60px rgba(0,0,0,.16);
  --grad:linear-gradient(135deg,#00c37a,#2d9cdb);
  --grad2:linear-gradient(135deg,#7c3aed,#e91e8c);
  --r:16px;
  --panel-w:300px;
}
.dark{
  --bg:#080e1a;--surf:#101827;--surf2:#0c1422;--surf3:#1a2336;
  --bdr:rgba(255,255,255,.07);--bdr2:rgba(255,255,255,.12);
  --t1:#e8ecf2;--t2:#8a95a3;--t3:#4a5568;--t4:#1e2a3a;
}
body{font-family:var(--font);background:var(--bg);color:var(--t1);-webkit-font-smoothing:antialiased;font-size:14px}
button,input,select,textarea{font-family:var(--font)}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-thumb{background:rgba(0,195,122,.25);border-radius:4px}
.sp-app{height:100dvh;display:flex;flex-direction:column;overflow:hidden;width:100vw;background:var(--bg)}

.page-loader{position:fixed;inset:0;background:#060e1c;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px}
.page-loader-logo{width:60px;height:60px;background:var(--grad);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;animation:loaderPulse 1.4s ease-in-out infinite;box-shadow:0 0 40px rgba(0,195,122,.35)}
.page-loader-text{font-size:15px;font-weight:700;color:#fff;letter-spacing:.05em}
.page-loader-sub{font-size:11px;color:rgba(255,255,255,.35);letter-spacing:.08em;text-transform:uppercase}
.page-loader-bar{width:200px;height:3px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden}
.page-loader-fill{height:100%;background:var(--grad);border-radius:3px;transition:width .25s ease}
.page-loader-steps{display:flex;flex-direction:column;gap:8px;margin-top:4px;width:240px}
.page-loader-step{display:flex;align-items:center;gap:9px;padding:7px 11px;border-radius:9px;font-size:11px;font-weight:700;transition:all .3s}
.page-loader-step.done{background:rgba(0,195,122,.1);border:1px solid rgba(0,195,122,.2);color:#5ee3b7}
.page-loader-step.active{background:rgba(45,156,219,.1);border:1px solid rgba(45,156,219,.2);color:#7ed3f7}
.page-loader-step.pending{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.3)}
@keyframes loaderPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}

.route-enter{animation:routeIn .32s cubic-bezier(.34,1.05,.64,1) both}
@keyframes routeIn{from{opacity:0;transform:scale(.97) translateY(8px)}to{opacity:1;transform:none}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes recBlink{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes rPop{0%{opacity:0;transform:translate(-50%,-60%) scale(.2)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.2)}60%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-120%) scale(.6)}}
@keyframes dotPulse{0%,80%,100%{transform:scale(.4);opacity:.3}40%{transform:scale(1);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:none}}

.sp-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:var(--surf);border:1px solid var(--bdr2);border-radius:12px;padding:9px 15px;font-size:12.5px;font-weight:600;color:var(--t1);box-shadow:var(--sh2);z-index:9999;display:flex;align-items:center;gap:7px;animation:slideUp .28s cubic-bezier(.34,1.2,.64,1);white-space:nowrap;max-width:calc(100vw - 32px)}
.sp-toast.success{border-color:rgba(0,195,122,.35)}.sp-toast.error{border-color:rgba(229,62,62,.35)}.sp-toast.warn{border-color:rgba(246,166,35,.35)}.sp-toast.info{border-color:rgba(45,156,219,.3)}

.fi{margin-bottom:10px}.fl{display:block;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--t3);margin-bottom:4px}
.finput{width:100%;padding:9px 12px;border-radius:10px;border:1.5px solid var(--bdr);background:var(--surf);color:var(--t1);font-size:13.5px;outline:none;transition:all .16s}
.finput:focus{border-color:var(--em);box-shadow:0 0 0 3px rgba(0,195,122,.1)}
.finput::placeholder{color:var(--t3)}.finput:disabled{opacity:.4;cursor:not-allowed}
select.finput{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238a95a3' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:28px}
.fi-row{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.btn-p{padding:10px 20px;border-radius:10px;border:none;cursor:pointer;background:var(--grad);color:#fff;font-size:13.5px;font-weight:700;transition:all .2s;box-shadow:0 4px 16px rgba(0,195,122,.24);display:inline-flex;align-items:center;justify-content:center;gap:7px;font-family:var(--font);width:100%}
.btn-p:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 7px 24px rgba(0,195,122,.34)}
.btn-p:disabled{opacity:.35;cursor:not-allowed;transform:none;box-shadow:none}
.btn-s{padding:8px 15px;border-radius:9px;border:1.5px solid var(--bdr);background:var(--surf2);cursor:pointer;color:var(--t2);font-size:12.5px;font-weight:600;transition:.16s;font-family:var(--font);display:inline-flex;align-items:center;justify-content:center;gap:5px}
.btn-s:hover{border-color:rgba(0,195,122,.3);color:var(--t1);background:rgba(0,195,122,.05)}
.btn-d{padding:8px 15px;border-radius:9px;border:1.5px solid rgba(229,62,62,.25);background:rgba(229,62,62,.06);cursor:pointer;color:var(--red);font-size:12.5px;font-weight:600;transition:.16s;font-family:var(--font);display:inline-flex;align-items:center;justify-content:center;gap:5px}
.btn-d:hover{background:rgba(229,62,62,.12)}
.loader-spin{width:18px;height:18px;border-radius:50%;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;animation:spin .65s linear infinite;flex-shrink:0}
.lo-progress{width:100%;height:3px;background:rgba(0,0,0,.06);border-radius:3px;overflow:hidden;margin-top:6px}
.lo-progress-fill{height:100%;background:var(--grad);border-radius:3px;transition:width .35s ease}

.sp-setup{display:grid;grid-template-columns:36% 1fr;height:100%;overflow:hidden;width:100%;flex:1;min-height:0}
.sp-left{background:#060e1c;position:relative;overflow:hidden;display:flex;flex-direction:column}
.sp-left-inner{flex:1;overflow-y:auto;padding:clamp(16px,2.5vw,32px) clamp(14px,2vw,28px);position:relative;z-index:2;display:flex;flex-direction:column}
.sp-grid-lines{position:absolute;inset:0;background-image:linear-gradient(rgba(0,195,122,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(0,195,122,.055) 1px,transparent 1px);background-size:42px 42px;pointer-events:none}
.sp-glow1{position:absolute;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,rgba(0,195,122,.15) 0%,transparent 70%);top:-120px;left:-120px;pointer-events:none}
.sp-glow2{position:absolute;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(45,156,219,.1) 0%,transparent 70%);bottom:-60px;right:-40px;pointer-events:none;animation:pulse 7s ease-in-out infinite}
.sp-logo{display:flex;align-items:center;gap:9px;margin-bottom:16px;animation:fadeUp .45s ease both}
.sp-logo-ico{width:32px;height:32px;background:var(--grad);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 6px 18px rgba(0,195,122,.35)}
.sp-logo-name{font-size:14px;font-weight:800;background:linear-gradient(90deg,#fff 0%,#5ee3b7 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sp-badge{display:inline-flex;align-items:center;gap:6px;padding:3px 11px;border-radius:100px;background:rgba(0,195,122,.12);border:1px solid rgba(0,195,122,.28);font-size:10px;font-weight:700;color:#5ee3b7;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;animation:fadeUp .45s ease .08s both;width:fit-content}
.sp-badge-dot{width:5px;height:5px;border-radius:50%;background:#5ee3b7;animation:pulse 1.8s infinite}
.sp-h1{font-size:clamp(16px,1.8vw,24px);font-weight:900;line-height:1.1;letter-spacing:-.5px;color:#fff;margin-bottom:7px;animation:fadeUp .45s ease .14s both}
.sp-h1 .hl{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sp-desc{font-size:11px;color:rgba(255,255,255,.38);line-height:1.8;margin-bottom:14px;animation:fadeUp .45s ease .2s both}
.sp-features{display:flex;flex-direction:column;gap:5px;animation:fadeUp .45s ease .26s both}
.sp-feat{display:flex;align-items:center;gap:8px;padding:7px 10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:10px;transition:.25s}
.sp-feat:hover{background:rgba(0,195,122,.08);border-color:rgba(0,195,122,.22)}
.sp-feat-ic{width:28px;height:28px;border-radius:8px;background:rgba(0,195,122,.18);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
.sp-feat-t{font-size:11px;font-weight:700;color:#fff}
.sp-feat-d{font-size:9.5px;color:rgba(255,255,255,.35);margin-top:1px}
.ctx-chip{margin-top:10px;padding:9px 12px;border-radius:11px;background:rgba(0,195,122,.07);border:1px solid rgba(0,195,122,.2);animation:fadeUp .45s ease .32s both}
.ctx-chip-lbl{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--em);margin-bottom:3px}
.ctx-chip-val{font-size:12px;font-weight:700;color:#fff}
.ctx-chip-sub{font-size:10px;color:rgba(255,255,255,.38);margin-top:1px}

.sp-right{background:var(--surf);overflow:hidden;display:flex;flex-direction:column}
.sp-right-scroll{overflow-y:auto;flex:1;padding:clamp(14px,2vw,28px);-webkit-overflow-scrolling:touch}
.sp-right-inner{max-width:560px;margin:0 auto;width:100%}
.back-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:9px;border:1.5px solid rgba(0,195,122,.25);background:rgba(0,195,122,.06);cursor:pointer;font-size:12.5px;font-weight:700;color:var(--em);transition:all .2s;margin-bottom:14px;font-family:var(--font)}
.back-btn:hover{background:rgba(0,195,122,.12);transform:translateX(-2px)}
.setup-h{font-size:clamp(14px,1.6vw,18px);font-weight:900;letter-spacing:-.3px;color:var(--t1);margin-bottom:3px}
.setup-sub{font-size:11px;color:var(--t2);margin-bottom:14px;line-height:1.6}

.module-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:14px}
.module-card{padding:13px;border-radius:13px;border:2px solid var(--bdr);background:var(--surf2);cursor:pointer;transition:all .2s;display:flex;gap:10px;align-items:flex-start}
.module-card:hover{border-color:rgba(0,195,122,.3);background:rgba(0,195,122,.03);transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,195,122,.1)}
.module-card.sel{border-color:var(--em);background:rgba(0,195,122,.06);box-shadow:0 6px 20px rgba(0,195,122,.12)}
.mod-ic{width:36px;height:36px;border-radius:11px;background:rgba(0,195,122,.12);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;transition:.2s}
.module-card.sel .mod-ic{background:rgba(0,195,122,.2)}
.mod-title{font-size:12px;font-weight:800;color:var(--t1);margin-bottom:3px}
.mod-desc{font-size:10px;color:var(--t2);line-height:1.5}
.module-card.sel .mod-title{color:var(--em)}

.submode-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:14px}
.submode-card{padding:15px 13px;border-radius:13px;border:2px solid var(--bdr);background:var(--surf2);cursor:pointer;transition:all .22s;text-align:center;display:flex;flex-direction:column;align-items:center;gap:5px}
.submode-card:hover{border-color:rgba(0,195,122,.3);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,195,122,.1)}
.submode-card.sel{border-color:var(--em);background:rgba(0,195,122,.06);box-shadow:0 6px 20px rgba(0,195,122,.14)}
.submode-ic{font-size:26px;margin-bottom:2px}
.submode-title{font-size:12.5px;font-weight:800;color:var(--t1)}
.submode-desc{font-size:10px;color:var(--t2);line-height:1.5}
.submode-card.sel .submode-title{color:var(--em)}

.sec-div{font-size:9.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);margin-bottom:8px;margin-top:6px;display:flex;align-items:center;gap:7px}
.sec-div::after{content:'';flex:1;height:1px;background:var(--bdr)}

.timing-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.timing-card{padding:11px 12px;border-radius:11px;border:2px solid var(--bdr);background:var(--surf2);cursor:pointer;transition:all .2s;display:flex;align-items:flex-start;gap:9px}
.timing-card:hover{border-color:rgba(0,195,122,.28)}
.timing-card.sel{border-color:var(--em);background:rgba(0,195,122,.05)}
.timing-ic{font-size:16px}
.timing-title{font-size:12px;font-weight:800;color:var(--t1);margin-bottom:1px}
.timing-desc{font-size:10px;color:var(--t2)}
.timing-card.sel .timing-title{color:var(--em)}

.steps{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
.step-r{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:9px;border:1px solid var(--bdr);background:var(--surf2);transition:.18s}
.step-r.done{border-color:rgba(0,195,122,.28);background:rgba(0,195,122,.04)}
.step-r.act{border-color:rgba(45,156,219,.28);background:rgba(45,156,219,.04)}
.step-r.pend{opacity:.42}
.step-num{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0}
.step-r.done .step-num{background:var(--em);color:#fff}
.step-r.act .step-num{background:var(--sky);color:#fff}
.step-r.pend .step-num{background:var(--surf3);color:var(--t3)}
.step-lbl{font-size:12px;font-weight:600;color:var(--t2)}
.step-r.done .step-lbl{color:var(--em)}.step-r.act .step-lbl{color:var(--t1)}.step-r.pend .step-lbl{color:var(--t3)}

.link-box{border-radius:12px;background:rgba(0,195,122,.04);border:1.5px solid rgba(0,195,122,.15);padding:11px 13px;margin-top:10px}
.link-lbl{font-size:9.5px;font-weight:800;color:var(--em);text-transform:uppercase;letter-spacing:.07em;margin-bottom:7px}
.link-row{display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:8px;background:var(--surf);border:1px solid var(--bdr)}
.link-val{flex:1;font-family:var(--mono);font-size:10px;color:var(--em);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.copy-btn{padding:4px 10px;border-radius:6px;border:none;cursor:pointer;background:var(--grad);color:#fff;font-size:11px;font-weight:700;transition:.15s;flex-shrink:0}
.copy-btn:hover{transform:scale(1.04)}

.overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(8px);z-index:700;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .18s ease}
.modal{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--r);width:100%;max-height:calc(100dvh - 28px);display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--sh3);animation:slideUp .25s cubic-bezier(.34,1.1,.64,1)}
.mh{padding:14px 18px 12px;border-bottom:1px solid var(--surf3);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.mh-title{font-size:14.5px;font-weight:800;color:var(--t1)}
.mh-close{width:25px;height:25px;border-radius:7px;border:1px solid var(--bdr);background:var(--surf2);cursor:pointer;color:var(--t2);display:flex;align-items:center;justify-content:center;font-size:11px;transition:.12s}
.mh-close:hover{color:var(--t1);transform:rotate(90deg)}
.mb{padding:16px 18px;overflow-y:auto;flex:1}
.mf{padding:11px 18px;border-top:1px solid var(--surf3);display:flex;justify-content:flex-end;gap:7px;flex-shrink:0;flex-wrap:wrap}

.sound-analyser{display:flex;align-items:center;gap:3px;padding:0 2px}
.sound-analyser .bar{width:3px;border-radius:3px;min-height:3px;background:var(--color,#00c37a);transition:height .12s}
.sound-analyser.active .bar{animation:soundBar 1.1s ease-in-out infinite}
@keyframes soundBar{0%,100%{height:5px}50%{height:20px}}

.prep-page{height:100dvh;background:#07111e;color:#e8ecf2;display:flex;flex-direction:column;overflow:hidden;width:100vw}
.prep-bar{height:52px;background:rgba(7,17,30,.98);border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;padding:0 12px;gap:8px;flex-shrink:0;overflow:hidden;position:relative;z-index:10}
.prep-bar-logo{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:800;color:#fff;cursor:pointer;border:none;background:none;font-family:var(--font);white-space:nowrap;flex-shrink:0}
.prep-bar-logo-ic{width:26px;height:26px;background:var(--grad);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
.prep-bar-div{width:1px;height:16px;background:rgba(255,255,255,.1);flex-shrink:0}
.prep-bar-topic{flex:1;font-size:11px;font-weight:500;color:rgba(255,255,255,.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.prep-bar-topic strong{color:#e8ecf2;font-weight:700}
.prep-pill{display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:7px;font-size:10px;font-weight:700;flex-shrink:0;border:1px solid;white-space:nowrap}
.pp-timer{background:rgba(0,195,122,.12);border-color:rgba(0,195,122,.2);color:#5ee3b7;font-family:var(--mono)}
.pp-mode{background:rgba(45,156,219,.1);border-color:rgba(45,156,219,.2);color:#7ed3f7}
.pp-demo{background:rgba(246,166,35,.12);border-color:rgba(246,166,35,.22);color:#fcd18e;animation:pulse 1.5s infinite}
.pp-paused{background:rgba(229,62,62,.12);border-color:rgba(229,62,62,.22);color:var(--red)}
.prep-bar-end{padding:5px 13px;border-radius:8px;border:1px solid rgba(229,62,62,.35);background:rgba(229,62,62,.1);color:var(--red);cursor:pointer;font-size:11px;font-weight:700;transition:.15s;flex-shrink:0;font-family:var(--font)}
.prep-bar-end:hover{background:rgba(229,62,62,.22)}

.paused-overlay{position:absolute;inset:0;background:rgba(3,10,20,.75);backdrop-filter:blur(4px);z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;animation:fadeIn .2s ease}
.paused-badge{padding:10px 22px;border-radius:40px;background:rgba(229,62,62,.15);border:2px solid rgba(229,62,62,.4);display:flex;align-items:center;gap:10px;font-size:16px;font-weight:800;color:var(--red)}
.paused-sub{font-size:12px;color:rgba(255,255,255,.35);text-align:center;max-width:260px;line-height:1.6}
.paused-resume-btn{padding:10px 28px;border-radius:12px;background:var(--grad);border:none;cursor:pointer;font-size:14px;font-weight:800;color:#fff;font-family:var(--font);box-shadow:0 4px 20px rgba(0,195,122,.28);transition:.18s}
.paused-resume-btn:hover{transform:scale(1.04)}

.prep-body{flex:1;display:grid;transition:grid-template-columns .28s ease;overflow:hidden;min-height:0}
.prep-body.panel-open{grid-template-columns:1fr var(--panel-w)}
.prep-body.panel-closed{grid-template-columns:1fr 0px}
.prep-main-area{display:flex;flex-direction:column;overflow:hidden;position:relative;min-width:0}
.prep-stage{flex:1;background:#030a14;display:flex;flex-direction:column;position:relative;overflow:hidden;min-height:0}
.prep-tiles-grid{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;gap:0;z-index:1}
.prep-tile{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:1px solid rgba(255,255,255,.06);transition:border-color .3s,box-shadow .3s;overflow:hidden;background:#0a1628}
.prep-tile.speaking{border-color:var(--em);box-shadow:inset 0 0 0 2px var(--em),0 0 24px rgba(0,195,122,.18)}
.prep-tile.speaking-ai{border-color:var(--sky);box-shadow:inset 0 0 0 2px var(--sky),0 0 24px rgba(45,156,219,.18)}
.prep-tile-you-badge,.prep-tile-ai-badge{position:absolute;top:10px;left:10px;font-size:8.5px;font-weight:800;padding:2px 7px;border-radius:4px;z-index:3}
.prep-tile-you-badge{background:rgba(0,195,122,.85);color:#000}
.prep-tile-ai-badge{background:rgba(45,156,219,.85);color:#000}
.prep-tile-av{width:clamp(44px,6vw,68px);height:clamp(44px,6vw,68px);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:clamp(16px,2.5vw,24px);font-weight:800;border:2px solid rgba(0,195,122,.3)}
.prep-tile-name{font-size:clamp(11px,1.2vw,13px);font-weight:700;color:#e8ecf2}
.prep-tile-role{font-size:clamp(9px,0.9vw,10.5px);color:rgba(255,255,255,.4)}
.prep-tile-analyser{position:absolute;bottom:10px;right:10px;z-index:3}
.prep-tile-muted{position:absolute;top:10px;right:10px;font-size:14px;z-index:3}
.prep-tile-ai-icon{font-size:clamp(28px,4vw,48px);filter:drop-shadow(0 0 16px rgba(45,156,219,.4))}
.prep-tile-typing{display:flex;gap:4px;align-items:center;margin-top:4px}
.prep-tile-typing-dot{width:6px;height:6px;border-radius:50%;background:#7ed3f7;animation:dotPulse .8s ease-in-out infinite}
.prep-live-transcript{position:absolute;bottom:0;left:0;right:0;z-index:5;background:linear-gradient(transparent,rgba(3,10,20,.95));padding:12px 16px 10px}
.plt-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:rgba(0,195,122,.7);margin-bottom:4px;display:flex;align-items:center;gap:5px}
.plt-dot{width:5px;height:5px;border-radius:50%;background:var(--em);animation:pulse 1.2s infinite}
.plt-text{font-size:12px;line-height:1.6;color:rgba(255,255,255,.8);font-family:var(--mono);min-height:18px}
.plt-empty{font-size:11px;color:rgba(255,255,255,.25);font-style:italic}

.ai-suggestion-banner{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,rgba(45,156,219,.95),rgba(124,58,237,.9));border:1.5px solid rgba(45,156,219,.5);border-radius:14px;padding:12px 16px;min-width:280px;max-width:420px;box-shadow:0 8px 32px rgba(45,156,219,.3);z-index:20;display:flex;gap:10px;align-items:flex-start}
.ai-suggestion-banner .ai-icon{font-size:20px;flex-shrink:0;margin-top:1px}
.ai-suggestion-banner .ai-content{flex:1;min-width:0}
.ai-suggestion-banner .ai-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.6);margin-bottom:3px}
.ai-suggestion-banner .ai-text{font-size:12px;font-weight:600;color:#fff;line-height:1.5}
.ai-suggestion-banner .ai-close{width:22px;height:22px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.1);cursor:pointer;color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}

.panel-toggle-fab{position:absolute;top:50%;right:0;transform:translateY(-50%);width:20px;height:48px;background:rgba(7,17,30,.9);border:1px solid rgba(255,255,255,.1);border-right:none;border-radius:8px 0 0 8px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.4);font-size:10px;z-index:10;transition:.16s}
.panel-toggle-fab:hover{color:#fff;background:rgba(0,195,122,.15)}

.prep-ctrl-bar{min-height:60px;padding:8px 12px;background:rgba(7,17,30,.98);border-top:1px solid rgba(255,255,255,.07);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:6px;overflow-x:auto}
.prep-ctrl-user-info{display:flex;align-items:center;gap:8px;min-width:0;flex:0 0 auto;max-width:160px}
.prep-ctrl-av{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0}
.prep-ctrl-details{min-width:0;flex:1}
.prep-ctrl-name{font-size:12px;font-weight:700;color:#e8ecf2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.prep-ctrl-sub{font-size:9.5px;color:rgba(255,255,255,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.prep-ctrl-center{display:flex;align-items:center;gap:3px;flex:1;justify-content:center;flex-wrap:nowrap}
.cbtn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 6px;border-radius:9px;border:1px solid rgba(255,255,255,.08);cursor:pointer;background:rgba(255,255,255,.05);color:rgba(255,255,255,.5);font-size:7.5px;font-weight:700;transition:all .16s;min-width:38px;font-family:var(--font)}
.cbtn-ic{font-size:13px;transition:transform .18s}
.cbtn:hover{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2);transform:translateY(-1px)}
.cbtn.on{background:rgba(0,195,122,.12);border-color:rgba(0,195,122,.3);color:#5ee3b7}
.cbtn.off{background:rgba(229,62,62,.1);border-color:rgba(229,62,62,.28);color:var(--red)}
.cbtn.hi{background:rgba(45,156,219,.12);border-color:rgba(45,156,219,.3);color:#7ed3f7}
.cbtn.em{background:rgba(0,195,122,.1);border-color:rgba(0,195,122,.25);color:#5ee3b7}
.cbtn.rec{background:rgba(229,62,62,.12);border-color:rgba(229,62,62,.4);color:var(--red);animation:recBlink 1.4s infinite}
.cbtn.pause-btn{background:rgba(246,166,35,.12);border-color:rgba(246,166,35,.3);color:#fcd18e}
.cbtn:disabled{opacity:.25;cursor:not-allowed;transform:none}
.cbtn-analyser{margin:1px 0;height:12px;display:flex;align-items:center}
.end-room-btn{padding:6px 13px;border-radius:9px;border:none;cursor:pointer;background:linear-gradient(135deg,#e53e3e,#c53030);color:#fff;font-size:11px;font-weight:800;font-family:var(--font);box-shadow:0 3px 10px rgba(229,62,62,.24);transition:.18s;white-space:nowrap}
.end-room-btn:hover{transform:translateY(-1px);box-shadow:0 5px 18px rgba(229,62,62,.38)}
.react-pop{position:absolute;bottom:calc(100% + 7px);left:50%;transform:translateX(-50%);background:#0d1e34;border:1px solid rgba(255,255,255,.1);border-radius:11px;padding:6px 8px;display:flex;gap:4px;box-shadow:var(--sh2);z-index:200;animation:scaleIn .18s ease}
.react-em{font-size:18px;cursor:pointer;padding:3px;border-radius:6px;border:none;background:none;transition:.14s}
.react-em:hover{transform:scale(1.4)}

.prep-side-panel{background:rgba(7,17,30,.97);border-left:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;overflow:hidden;width:var(--panel-w);min-width:0}
.prep-panel-header{display:flex;align-items:center;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
.prep-panel-tabs{display:flex;flex:1;overflow:hidden}
.prep-ptab{flex:1;padding:10px 4px;background:none;border:none;border-bottom:2px solid transparent;color:rgba(255,255,255,.3);font-size:9px;font-weight:700;cursor:pointer;transition:.16s;display:flex;flex-direction:column;align-items:center;gap:3px;font-family:var(--font);text-transform:uppercase;letter-spacing:.05em;white-space:nowrap}
.prep-ptab:hover{color:rgba(255,255,255,.6)}
.prep-ptab.active{color:#5ee3b7;border-bottom-color:var(--em)}
.prep-panel-close{width:36px;height:100%;background:none;border:none;border-left:1px solid rgba(255,255,255,.07);cursor:pointer;color:rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;font-size:13px;transition:.15s;flex-shrink:0;padding:10px 8px}
.prep-panel-close:hover{color:rgba(255,255,255,.8);background:rgba(229,62,62,.1)}
.prep-panel-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}

.prep-ai-msgs{display:flex;flex-direction:column;gap:7px;padding:12px;scroll-behavior:smooth}
.prep-ai-msg{animation:fadeUp .22s ease;width:100%}
.prep-ai-msg.from-ai{display:flex;gap:7px;align-items:flex-start}
.prep-ai-msg.from-me{display:flex;flex-direction:row-reverse;gap:7px;align-items:flex-start}
.prep-ai-bubble-av{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;align-self:flex-end}
.prep-ai-bubble-av.ai-side{background:rgba(45,156,219,.2);color:#7ed3f7;border:1px solid rgba(45,156,219,.2)}
.prep-ai-bubble-av.me-side{background:rgba(0,195,122,.2);color:#5ee3b7;border:1px solid rgba(0,195,122,.2)}
.prep-ai-bubble{padding:8px 11px;border-radius:10px;font-size:11.5px;line-height:1.65;max-width:88%;word-break:break-word}
.prep-ai-bubble.ai-style{background:rgba(45,156,219,.09);border:1px solid rgba(45,156,219,.15);color:#d0e8ff;border-radius:3px 10px 10px 10px}
.prep-ai-bubble.me-style{background:linear-gradient(135deg,rgba(0,195,122,.85),rgba(0,163,102,.95));color:#fff;border:none;border-radius:10px 3px 10px 10px}
.prep-ai-bubble.system-style{background:rgba(246,166,35,.07);border:1px solid rgba(246,166,35,.18);color:#fcd18e;font-size:10.5px;border-radius:9px;text-align:center;padding:6px 11px}
.prep-ai-typing{display:flex;gap:4px;padding:8px 12px;background:rgba(45,156,219,.09);border:1px solid rgba(45,156,219,.15);border-radius:3px 10px 10px 10px;width:fit-content}
.prep-ai-typing-dot{width:5px;height:5px;border-radius:50%;background:#7ed3f7;animation:dotPulse .8s ease-in-out infinite}
.prep-ai-speaking-row{padding:6px 10px;border-top:1px solid rgba(255,255,255,.06);background:rgba(45,156,219,.06);display:flex;align-items:center;gap:7px;flex-shrink:0;min-height:32px}
.prep-ai-speaking-text{font-size:10px;font-weight:700;color:#7ed3f7}
.quick-prompts{display:flex;gap:5px;flex-wrap:wrap;padding:7px 10px}
.quick-p{padding:3px 9px;border-radius:6px;border:1px solid rgba(45,156,219,.22);background:rgba(45,156,219,.07);cursor:pointer;font-size:9.5px;font-weight:600;color:#7ed3f7;transition:.15s;font-family:var(--font)}
.quick-p:hover{background:rgba(45,156,219,.16);border-color:rgba(45,156,219,.4)}
.prep-ai-input-area{padding:9px 10px;border-top:1px solid rgba(255,255,255,.07);flex-shrink:0;background:rgba(7,17,30,.7)}
.prep-ai-input-row{display:flex;gap:6px;align-items:flex-end}
.prep-ai-input{flex:1;padding:7px 10px;border-radius:9px;border:1.5px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:#e8ecf2;font-size:11.5px;outline:none;resize:none;min-height:34px;max-height:72px;font-family:var(--font);line-height:1.5}
.prep-ai-input:focus{border-color:rgba(45,156,219,.5);background:rgba(45,156,219,.06)}
.prep-ai-input::placeholder{color:rgba(255,255,255,.2)}
.prep-ai-voice-btn{width:34px;height:34px;border-radius:9px;border:1.5px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:.15s;flex-shrink:0}
.prep-ai-voice-btn.listening{background:rgba(229,62,62,.15);border-color:rgba(229,62,62,.4);animation:recBlink 1.2s infinite}
.prep-ai-send{width:34px;height:34px;border-radius:9px;background:var(--grad);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s;font-size:13px;flex-shrink:0}
.prep-ai-send:hover{transform:scale(1.08)}
.prep-ai-send:disabled{opacity:.35;cursor:not-allowed}

.prep-notes-header{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.prep-notes-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:rgba(255,255,255,.35)}
.prep-notes-count{font-size:9px;font-weight:700;padding:2px 7px;border-radius:5px;background:rgba(0,195,122,.12);color:#5ee3b7}
.prep-faq-list{padding:8px}
.prep-faq-item{border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);margin-bottom:6px;overflow:hidden;transition:.2s}
.prep-faq-q{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 11px;cursor:pointer;user-select:none}
.prep-faq-q-text{font-size:11px;font-weight:700;color:#e8ecf2;flex:1;line-height:1.4}
.prep-faq-chevron{font-size:10px;color:rgba(255,255,255,.3);transition:transform .2s;flex-shrink:0}
.prep-faq-chevron.open{transform:rotate(180deg)}
.prep-faq-a{padding:0 11px 9px;font-size:10.5px;line-height:1.7;color:rgba(255,255,255,.6);border-top:1px solid rgba(255,255,255,.06);padding-top:8px;white-space:pre-wrap}
.prep-faq-num{font-size:8px;font-weight:800;color:var(--em);margin-bottom:2px;text-transform:uppercase;letter-spacing:.05em}
.prep-actions-panel{padding:10px}
.prep-action-btn{padding:9px 12px;border-radius:10px;border:1.5px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);cursor:pointer;font-size:11.5px;font-weight:700;color:rgba(255,255,255,.7);transition:.18s;font-family:var(--font);display:flex;align-items:center;gap:8px;text-align:left;width:100%;margin-bottom:5px}
.prep-action-btn:hover{background:rgba(0,195,122,.1);border-color:rgba(0,195,122,.28);color:#5ee3b7}
.prep-action-btn.primary{background:var(--grad);border-color:transparent;color:#fff}
.prep-action-btn.pause-active{background:rgba(229,62,62,.12);border-color:rgba(229,62,62,.3);color:var(--red)}
.prep-action-btn.demo-active{background:rgba(246,166,35,.12);border-color:rgba(246,166,35,.25);color:#fcd18e}

.room-page{height:100dvh;display:flex;flex-direction:column;overflow:hidden;background:#07111e;width:100vw}
.room-bar{height:50px;background:rgba(7,17,30,.98);border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;padding:0 10px;gap:6px;flex-shrink:0;z-index:100;overflow:hidden}
.room-logo{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:#fff;border:none;background:none;cursor:pointer;font-family:var(--font);flex-shrink:0}
.room-logo-ic{width:24px;height:24px;background:var(--grad);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px}
.room-divider{width:1px;height:14px;background:rgba(255,255,255,.08);flex-shrink:0}
.room-topic{flex:1;font-size:10.5px;color:rgba(255,255,255,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;min-width:0}
.room-topic strong{color:#e8ecf2;font-weight:700}
.r-pill{display:flex;align-items:center;gap:3px;padding:2px 7px;border-radius:5px;font-size:9.5px;font-weight:700;flex-shrink:0;border:1px solid;white-space:nowrap}
.rp-timer{background:rgba(0,195,122,.12);border-color:rgba(0,195,122,.2);color:#5ee3b7;font-family:var(--mono)}
.rp-ai{background:rgba(45,156,219,.1);border-color:rgba(45,156,219,.18);color:#7ed3f7}
.rbar-end-btn{padding:3px 9px;border-radius:6px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:rgba(255,255,255,.5);cursor:pointer;font-size:10.5px;font-weight:700;transition:.15s;flex-shrink:0;font-family:var(--font)}
.rbar-end-btn:hover{background:rgba(229,62,62,.15);border-color:rgba(229,62,62,.3);color:var(--red)}
.room-body{flex:1;display:flex;min-height:0;overflow:hidden}
.grid-area{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden;position:relative}
.ss-area{flex:1;background:#030a14;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;min-height:0}
.ss-video{width:100%;height:100%;object-fit:contain;background:#000;display:block}
.ss-placeholder{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:rgba(255,255,255,.2)}
.ss-active-label{position:absolute;top:10px;left:50%;transform:translateX(-50%);background:rgba(0,195,122,.15);border:1px solid rgba(0,195,122,.3);border-radius:8px;padding:5px 14px;font-size:11px;font-weight:700;color:#5ee3b7;white-space:nowrap;display:flex;align-items:center;gap:6px;z-index:2}
.ss-active-dot{width:6px;height:6px;border-radius:50%;background:var(--em);animation:pulse 1s infinite}
.presenter-strip{height:96px;background:rgba(0,0,0,.4);border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:6px;padding:6px 10px;overflow-x:auto;flex-shrink:0}
.strip-tile{width:124px;min-width:124px;height:80px;border-radius:10px;background:#0d1e34;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;border:1.5px solid rgba(255,255,255,.06);transition:.2s;flex-shrink:0}
.strip-tile.spk{border-color:var(--em);box-shadow:0 0 12px rgba(0,195,122,.2)}
.strip-av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;width:34px;height:34px;font-size:13px}
.strip-ov{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.85));padding:10px 6px 5px;display:flex;align-items:flex-end;justify-content:space-between}
.strip-name{font-size:9.5px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
.live-transcript-bar{padding:6px 10px;border-top:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.35);flex-shrink:0}
.lt-label{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:rgba(0,195,122,.6);margin-bottom:2px;display:flex;align-items:center;gap:4px}
.lt-dot{width:5px;height:5px;border-radius:50%;background:var(--em);animation:pulse 1.2s infinite;flex-shrink:0}
.lt-text{font-size:10px;color:rgba(255,255,255,.55);line-height:1.5;font-family:var(--mono);min-height:14px}
.ctrl-bar{min-height:56px;padding:6px 10px;background:rgba(7,17,30,.98);border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:5px;flex-wrap:wrap}
.cg{display:flex;align-items:center;gap:3px;flex-wrap:wrap}
.end-room-btn-sm{padding:6px 12px;border-radius:8px;border:none;cursor:pointer;background:linear-gradient(135deg,#e53e3e,#c53030);color:#fff;font-size:11px;font-weight:800;font-family:var(--font);box-shadow:0 3px 10px rgba(229,62,62,.24);transition:.18s;white-space:nowrap}
.side-panel{width:260px;min-width:260px;background:rgba(7,17,30,.98);border-left:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;overflow:hidden}
.panel-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
.ptab{flex:1;padding:8px 3px;background:none;border:none;border-bottom:2px solid transparent;color:rgba(255,255,255,.28);font-size:8px;font-weight:700;cursor:pointer;transition:.16s;display:flex;flex-direction:column;align-items:center;gap:2px;font-family:var(--font);text-transform:uppercase;letter-spacing:.05em}
.ptab.active{color:#5ee3b7;border-bottom-color:var(--em)}
.pscroll{flex:1;overflow-y:auto;min-height:0;-webkit-overflow-scrolling:touch}
.p-list{padding:7px;display:flex;flex-direction:column;gap:4px}
.p-row{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);transition:.16s}
.p-av{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0}
.p-info{flex:1;min-width:0}
.p-name{font-size:11px;font-weight:700;color:#e8ecf2}
.p-role{font-size:9px;color:rgba(255,255,255,.28)}
.chat-msgs{padding:8px;display:flex;flex-direction:column;gap:5px}
.chat-msg{display:flex;gap:5px;animation:fadeUp .18s ease}
.chat-msg.own{flex-direction:row-reverse}
.chat-av-s{width:18px;height:18px;border-radius:50%;font-size:7.5px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;align-self:flex-end}
.chat-bw{display:flex;flex-direction:column;gap:2px;max-width:84%}
.chat-msg.own .chat-bw{align-items:flex-end}
.chat-sender{font-size:8.5px;font-weight:700;color:rgba(255,255,255,.25)}
.chat-bubble{padding:5px 8px;border-radius:9px;font-size:11px;line-height:1.5;word-break:break-word}
.b-o{background:rgba(255,255,255,.07);color:#e8ecf2;border:1px solid rgba(255,255,255,.07);border-radius:3px 9px 9px 9px}
.b-own{background:var(--grad);color:#fff;border-radius:9px 3px 9px 9px}
.chat-t{font-size:8px;color:rgba(255,255,255,.18)}
.chat-empty{text-align:center;color:rgba(255,255,255,.2);font-size:11px;padding:18px 10px;line-height:1.7}
.chat-ia{padding:7px;border-top:1px solid rgba(255,255,255,.07);display:flex;gap:5px;align-items:flex-end;flex-shrink:0}
.chat-inp{flex:1;padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#e8ecf2;font-size:11px;outline:none;resize:none;min-height:30px;max-height:64px;font-family:var(--font)}
.chat-send{width:28px;height:28px;border-radius:7px;background:var(--grad);border:none;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center}

.results-page{flex:1;overflow-y:auto;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:max(40px, 10vh) clamp(18px,4vw,52px) clamp(18px,4vw,52px);text-align:center;background:radial-gradient(ellipse at 50% 20%,rgba(0,195,122,.07) 0%,transparent 65%);width:100%;min-height:100dvh}
.res-trophy{font-size:clamp(42px,8vw,64px);margin-bottom:12px}
.res-h{font-size:clamp(17px,3vw,28px);font-weight:900;letter-spacing:-.4px;margin-bottom:6px;color:var(--t1)}
.res-sub{font-size:12px;color:var(--t2);max-width:320px;line-height:1.75;margin-bottom:16px}
.res-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;width:100%;max-width:300px;margin-bottom:14px}
.res-stat{background:var(--surf);border:1px solid var(--bdr);border-radius:13px;padding:10px;box-shadow:var(--sh);text-align:center}
.res-stat-ic{font-size:16px;margin-bottom:3px}
.res-stat-v{font-size:clamp(14px,2vw,20px);font-weight:900;color:var(--em)}
.res-stat-l{font-size:9px;color:var(--t3);margin-top:1px}
.res-acts{display:flex;gap:7px;flex-wrap:wrap;justify-content:center}

.analysis-bg{position:fixed;inset:0;background:rgba(0,0,0,.68);backdrop-filter:blur(12px);z-index:800;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .2s ease}
.analysis-box{background:#0c1422;border:1px solid rgba(0,195,122,.2);border-radius:var(--r);width:100%;max-width:580px;max-height:88dvh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--sh3)}
.analysis-head{padding:13px 17px 11px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.analysis-title{font-size:14px;font-weight:800;color:#e8ecf2}
.analysis-body{overflow-y:auto;flex:1;padding:14px 17px}
.a-sec{margin-bottom:13px}
.a-sec-title{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.28);margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,.07)}
.analysis-foot{padding:10px 17px;border-top:1px solid rgba(255,255,255,.08);display:flex;justify-content:flex-end;gap:7px;flex-shrink:0;flex-wrap:wrap}

.results-loader{position:fixed;inset:0;background:rgba(8,16,30,.96);z-index:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;animation:fadeIn .2s ease}
.results-loader-icon{font-size:48px}
.results-loader-title{font-size:16px;font-weight:800;color:#e8ecf2}
.results-loader-sub{font-size:11px;color:rgba(255,255,255,.35)}
.results-loader-steps{display:flex;flex-direction:column;gap:8px;margin-top:10px;width:280px}
.results-loader-step{display:flex;align-items:center;gap:9px;padding:7px 11px;border-radius:9px;font-size:11px;font-weight:700;transition:all .3s}
.results-loader-step.done{background:rgba(0,195,122,.1);border:1px solid rgba(0,195,122,.2);color:#5ee3b7}
.results-loader-step.active{background:rgba(45,156,219,.1);border:1px solid rgba(45,156,219,.2);color:#7ed3f7}
.results-loader-step.pending{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.3)}

.hist-page{flex:1;overflow-y:auto;display:flex;justify-content:center;padding:clamp(16px,3vw,40px);width:100%;min-height:0;-webkit-overflow-scrolling:touch}
.hist-inner{width:100%;max-width:1080px}
.hist-topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:22px}
.hist-title-wrap{display:flex;align-items:center;gap:12px}
.hist-logo-ic{width:44px;height:44px;background:var(--grad);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 8px 22px rgba(0,195,122,.28);flex-shrink:0}
.hist-h1{font-size:clamp(18px,2.6vw,26px);font-weight:900;letter-spacing:-.4px;color:var(--t1)}
.hist-sub{font-size:12px;color:var(--t2);margin-top:2px}
.hist-new-btn{padding:12px 22px;border-radius:13px;border:none;cursor:pointer;background:var(--grad);color:#fff;font-size:13.5px;font-weight:800;display:inline-flex;align-items:center;gap:8px;box-shadow:0 6px 20px rgba(0,195,122,.3);transition:.18s;font-family:var(--font);white-space:nowrap;flex-shrink:0}
.hist-new-btn:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,195,122,.4)}
.hist-stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
.hist-stat-card{background:var(--surf);border:1px solid var(--bdr);border-radius:15px;padding:14px 16px;box-shadow:var(--sh)}
.hist-stat-ic{font-size:18px;margin-bottom:6px}
.hist-stat-v{font-size:clamp(16px,2.2vw,22px);font-weight:900;color:var(--t1)}
.hist-stat-l{font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-top:2px}
.hist-filter-tabs{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap}
.hist-ftab{padding:7px 15px;border-radius:20px;border:1.5px solid var(--bdr);background:var(--surf);color:var(--t2);font-size:12px;font-weight:700;cursor:pointer;transition:.16s;font-family:var(--font)}
.hist-ftab.active{border-color:var(--em);background:rgba(0,195,122,.08);color:var(--em)}
.hist-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;padding-bottom:20px}
.hist-card{background:var(--surf);border:1px solid var(--bdr);border-radius:17px;padding:16px;box-shadow:var(--sh);transition:all .2s;display:flex;flex-direction:column;gap:10px}
.hist-card:hover{transform:translateY(-3px);box-shadow:var(--sh2);border-color:rgba(0,195,122,.25)}
.hist-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.hist-card-badge{font-size:9.5px;font-weight:800;padding:3px 9px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;flex-shrink:0}
.hist-card-badge.completed{background:rgba(0,195,122,.1);color:var(--em);border:1px solid rgba(0,195,122,.22)}
.hist-card-badge.scheduled{background:rgba(246,166,35,.1);color:var(--amb);border:1px solid rgba(246,166,35,.22)}
.hist-card-score{font-size:13px;font-weight:900;color:var(--em)}
.hist-card-title{font-size:14px;font-weight:800;color:var(--t1);line-height:1.4}
.hist-card-meta{display:flex;gap:6px;flex-wrap:wrap}
.hist-chip{font-size:10px;font-weight:700;padding:3px 9px;border-radius:8px;background:var(--surf2);border:1px solid var(--bdr);color:var(--t2)}
.hist-card-foot{display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid var(--bdr);font-size:11px;color:var(--t3)}
.hist-card-actions{display:flex;gap:6px}
.hist-icon-btn{width:28px;height:28px;border-radius:8px;border:1px solid var(--bdr);background:var(--surf2);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--t2);transition:.15s}
.hist-icon-btn:hover{border-color:rgba(0,195,122,.3);color:var(--em);background:rgba(0,195,122,.06)}
.hist-empty{padding:60px 20px;text-align:center;color:var(--t3);border-radius:18px;border:1.5px dashed var(--bdr);background:var(--surf2)}
.hist-empty-ic{font-size:40px;margin-bottom:10px}

@media(max-width:1200px){:root{--panel-w:280px}.hist-stats-row{grid-template-columns:repeat(2,1fr)}}
@media(max-width:1024px){
  .sp-setup{grid-template-columns:34% 1fr}
  .side-panel{width:240px;min-width:240px}
  :root{--panel-w:260px}
}
@media(max-width:900px){
  :root{--panel-w:100%}
  .prep-body.panel-open{grid-template-columns:1fr}
  .prep-side-panel{position:absolute;right:0;top:0;bottom:0;z-index:30;width:min(320px,85vw);box-shadow:-8px 0 32px rgba(0,0,0,.5)}
  .prep-body.panel-closed .prep-side-panel{display:none}
  .prep-bar-topic{display:none}
  .room-body{flex-direction:column}
  .side-panel{width:100%;min-width:unset;border-left:none;border-top:1px solid rgba(255,255,255,.07);max-height:280px}
}
@media(max-width:860px){
  .sp-setup{grid-template-columns:1fr;height:auto;overflow:visible}
  html,body{overflow:auto}.sp-app{height:auto;min-height:100dvh;overflow:visible}.sp-left{min-height:auto}.sp-left-inner{padding:16px}
  .sp-features{display:grid;grid-template-columns:1fr 1fr;gap:5px}.ctx-chip{display:none}
  .sp-right{height:auto;overflow:visible}.sp-right-scroll{overflow:visible;height:auto}
}
@media(max-width:760px){
  .hist-stats-row{grid-template-columns:repeat(2,1fr)}
  .hist-grid{grid-template-columns:1fr}
  .hist-topbar{flex-direction:column;align-items:stretch}
  .hist-new-btn{justify-content:center}
}
@media(max-width:640px){
  .fi-row{grid-template-columns:1fr}.module-grid{grid-template-columns:1fr}.submode-grid{grid-template-columns:1fr 1fr}
  .sp-features{grid-template-columns:1fr}
  .ctrl-bar{padding:5px 7px;gap:3px}.cg{gap:2px}.cbtn{padding:4px 3px;min-width:32px;font-size:7px}.cbtn-ic{font-size:11px}
  .side-panel{display:none}.res-stats{grid-template-columns:1fr 1fr 1fr}
  .prep-ctrl-user-info{display:none}
  .prep-ctrl-center{justify-content:flex-start;gap:2px}
  .cbtn{min-width:34px;padding:4px 3px}
  .prep-tiles-grid{grid-template-columns:1fr}
  .prep-tiles-grid .prep-tile:nth-child(2){display:none}
  :root{--panel-w:100vw}
  .prep-side-panel{width:100vw;left:0;right:0}
}
@media(max-width:480px){
  .room-bar{height:44px;padding:0 8px;gap:4px}.r-pill{font-size:8.5px;padding:2px 5px}
  .strip-tile{width:100px;min-width:100px;height:66px}
  .res-acts{flex-direction:column;width:100%;max-width:280px}.res-acts button{width:100%}
  .prep-bar{height:46px;padding:0 8px;gap:4px}
  .prep-bar-logo span{display:none}
  .submode-grid{grid-template-columns:1fr}
  .prep-ctrl-bar{padding:5px 8px;gap:3px;min-height:54px}
  .hist-stats-row{grid-template-columns:1fr 1fr}
  .hist-card{padding:13px}
}
@media(max-width:360px){
  .cbtn{min-width:28px;padding:3px 2px;font-size:6.5px}
  .cbtn-ic{font-size:10px}
}
`;

/* ============================================================================================
   CONSTANTS
   ============================================================================================ */
const COLORS = ["#00c37a","#6366f1","#f59e0b","#38bdf8","#ec4899","#8b5cf6","#f97316","#06b6d4"];
const REACTIONS = ["👍","👏","❤️","🔥","🤔","🎓","✨","💡"];

const avColor = (n) => COLORS[(n || "T").charCodeAt(0) % COLORS.length];
const avInit = (n) => (n || "T").split(/[_\s]/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const genId = () => Math.random().toString(36).slice(2, 12);

/* ============================================================================================
   SHARED HOOKS
   ============================================================================================ */
function useTimer(running) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function usePausableTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const fmt = (n) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  return { display: fmt(elapsed), elapsed, isPaused: !running, pause: () => setRunning(false), resume: () => setRunning(true) };
}

function useSpeechRecognition() {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recRef = useRef(null);
  const start = useCallback((onResult) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onresult = (e) => {
      let final = "", interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      const combined = (final + " " + interim).trim();
      setTranscript(combined);
      if (final.trim()) onResult(final.trim());
    };
    rec.onerror = () => setIsListening(false);
    recRef.current = rec;
    try { rec.start(); } catch {}
  }, []);
  const stop = useCallback(() => { try { recRef.current?.stop(); } catch {} setIsListening(false); setTranscript(""); }, []);
  return { transcript, isListening, start, stop };
}

function useAIVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceRef = useRef(null);
  useEffect(() => {
    const pick = () => {
      const v = window.speechSynthesis?.getVoices() || [];
      voiceRef.current = v.find((x) => x.name.includes("Google UK English")) || v.find((x) => x.lang.startsWith("en") && !x.localService) || v[0] || null;
    };
    pick();
    window.speechSynthesis?.addEventListener("voiceschanged", pick);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", pick);
  }, []);
  const speak = useCallback((text, onDone, callbacks = {}) => {
    const onStart = typeof callbacks?.onStart === "function" ? callbacks.onStart : null;
    if (!("speechSynthesis" in window)) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95; u.pitch = 1; u.volume = 1;
    if (voiceRef.current) u.voice = voiceRef.current;
    u.onstart = () => { setIsSpeaking(true); onStart?.(); };
    u.onend = () => { setIsSpeaking(false); onDone?.(); };
    u.onerror = () => { setIsSpeaking(false); onDone?.(); };
    setTimeout(() => window.speechSynthesis.speak(u), 60);
  }, []);
  const cancel = useCallback(() => { window.speechSynthesis?.cancel(); setIsSpeaking(false); }, []);
  return useMemo(() => ({ isSpeaking, speak, cancel }), [isSpeaking, speak, cancel]);
}

function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg, type = "success") => setToast({ msg, type }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  const node = toast ? (
    <div className={`sp-toast ${toast.type}`} onClick={() => setToast(null)}>
      {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : toast.type === "warn" ? "⚠️" : "ℹ️"} {toast.msg}
    </div>
  ) : null;
  return { show, node };
}

/* ============================================================================================
   SHARED UI PIECES
   ============================================================================================ */
function SoundAnalyser({ active, color = "#00c37a", bars = 7, size = 32 }) {
  return (
    <div className={`sound-analyser${active ? " active" : ""}`} style={{ height: size, "--color": color }}>
      {Array.from({ length: bars }).map((_, i) => <div key={i} className="bar" style={{ height: active ? undefined : 3, animationDelay: `${i * 0.08}s` }} />)}
    </div>
  );
}

function PageLoader({ label = "Loading…", sublabel = "Setting up your session", steps = [] }) {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  useEffect(() => {
    let p = 0;
    const id = setInterval(() => { p += Math.random() * 18 + 8; if (p >= 100) { p = 100; clearInterval(id); } setProgress(Math.min(p, 100)); }, 180);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!steps.length) return;
    const delays = [500, 950, 1400, 1850];
    const timers = delays.map((d, i) => setTimeout(() => setStep(i + 1), d));
    return () => timers.forEach(clearTimeout);
  }, [steps]);
  return (
    <div className="page-loader">
      <div className="page-loader-logo">🎓</div>
      <div className="page-loader-text">{label}</div>
      <div className="page-loader-sub">{sublabel}</div>
      <div className="page-loader-bar"><div className="page-loader-fill" style={{ width: `${progress}%` }} /></div>
      {steps.length > 0 && (
        <div className="page-loader-steps">
          {steps.map((s, i) => (
            <div key={i} className={`page-loader-step ${i < step ? "done" : i === step ? "active" : "pending"}`}>
              <span style={{ fontSize: 13 }}>{s.ic}</span><span>{i < step ? "✓ " : ""}{s.label}</span>
              {i === step && <span className="loader-spin" style={{ marginLeft: "auto" }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultsLoader({ onDone, isObserver }) {
  const steps = isObserver
    ? [{ label: "Saving session notes", icon: "📝" }, { label: "Updating class record", icon: "📈" }, { label: "Preparing summary", icon: "🎓" }]
    : [{ label: "Analysing your delivery", icon: "🎙️" }, { label: "Scoring clarity & depth", icon: "📊" }, { label: "Generating AI feedback", icon: "🤖" }, { label: "Preparing full report", icon: "🏅" }];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const delays = isObserver ? [500, 950, 1400] : [450, 950, 1400, 1900];
    const timers = delays.map((d, i) => setTimeout(() => setStep(i + 1), d));
    timers.push(setTimeout(() => onDone(), isObserver ? 1900 : 2500));
    return () => timers.forEach(clearTimeout);
  }, [isObserver, onDone]);
  return (
    <div className="results-loader">
      <div className="results-loader-icon">{isObserver ? "👁️" : "📊"}</div>
      <div className="results-loader-title">{isObserver ? "Wrapping up…" : "Generating your report…"}</div>
      <div className="results-loader-sub">{isObserver ? "Thanks for sitting in" : "AI is reviewing the class delivery"}</div>
      <div className="results-loader-steps">
        {steps.map((s, i) => (
          <div key={i} className={`results-loader-step ${i < step ? "done" : i === step ? "active" : "pending"}`}>
            <span style={{ fontSize: 14 }}>{s.icon}</span><span>{i < step ? "✓ " : ""}{s.label}</span>
            {i === step && <span className="loader-spin" style={{ marginLeft: "auto" }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------- PDF export (client-side only, no backend needed) ---------------------------- */
function downloadSessionPDF({ config, timer, transcriptHistory, notes, messages, apiScores = null }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const now = new Date();
  const clean = (v) => String(v ?? "").replace(/[•]/g, "-").replace(/[–—]/g, "-").trim();

  doc.setFillColor(8, 14, 26); doc.rect(0, 0, 210, 297, "F");
  doc.setFillColor(0, 195, 122); doc.rect(0, 0, 210, 16, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(255, 255, 255);
  doc.text("SeminarArena — Teacher Report", 14, 10.5);

  doc.setFontSize(20); doc.setTextColor(255, 255, 255);
  doc.text("Class Session Report", 14, 34);
  doc.setFontSize(10); doc.setTextColor(140, 200, 180);
  doc.text(`Generated ${now.toLocaleDateString()} at ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, 14, 41);

  doc.setFontSize(12); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
  doc.text("Topic:", 14, 54);
  doc.setFont("helvetica", "normal"); doc.setTextColor(210, 220, 230);
  const topicLines = doc.splitTextToSize(clean(config?.topic || "—"), 170);
  doc.text(topicLines, 30, 54);

  let y = 54 + topicLines.length * 6 + 8;
  const meta = [["Teacher", config?.name || "—"], ["Subject", config?.subject || "—"], ["Unit", config?.unit || "—"], ["Duration", timer || "—"]];
  meta.forEach(([label, value], i) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(0, 195, 122);
    doc.text(label.toUpperCase(), 14 + i * 46, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    doc.text(clean(String(value)).slice(0, 22), 14 + i * 46, y + 6);
  });
  y += 18;

  if (apiScores) {
    doc.setFillColor(16, 24, 39); doc.roundedRect(14, y, 182, 46, 4, 4, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(0, 195, 122);
    doc.text("Performance Scores", 20, y + 10);
    const rows = [
      ["Conceptual Understanding", apiScores.conceptual_understanding, 30],
      ["Depth of Knowledge", apiScores.depth_of_knowledge, 25],
      ["Presentation Flow", apiScores.presentation_flow, 20],
      ["Engagement", apiScores.engagement, 15],
    ];
    rows.forEach(([label, val, max], i) => {
      const ry = y + 18 + i * 6.5;
      doc.setFontSize(9); doc.setTextColor(200, 210, 225); doc.setFont("helvetica", "normal");
      doc.text(label, 20, ry);
      doc.setTextColor(0, 195, 122); doc.setFont("helvetica", "bold");
      doc.text(`${val ?? 0}/${max}`, 185, ry, { align: "right" });
    });
    doc.setFontSize(20); doc.setTextColor(0, 195, 122); doc.setFont("helvetica", "bold");
    doc.text(`${apiScores.total_score ?? 0}`, 185, y + 10, { align: "right" });
    y += 54;
  }

  if (notes && notes.length) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(45, 156, 219);
    doc.text(`AI Notes (${notes.length})`, 14, y);
    y += 8;
    notes.forEach((n) => {
      if (y > 275) { doc.addPage(); doc.setFillColor(8, 14, 26); doc.rect(0, 0, 210, 297, "F"); y = 20; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
      const qLines = doc.splitTextToSize(clean(n.q), 180);
      doc.text(qLines, 14, y); y += qLines.length * 5 + 2;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(180, 190, 205);
      const aLines = doc.splitTextToSize(clean(n.a), 180);
      doc.text(aLines, 14, y); y += aLines.length * 4.6 + 8;
    });
  }

  doc.save(`seminararena-teacher-report-${Date.now()}.pdf`);
}

/* ============================================================================================
   HISTORY SCREEN  (new — entry point of the teacher module)
   ============================================================================================ */
function TeacherSeminarHistory({ teacherName, onNewSeminar, onOpenResult }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const { show: toast$, node: toastNode } = useToast();

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getSeminarHistory(); // 🔌 BACKEND: GET /api/v1/seminar/history
      setHistory(list);
    } catch {
      toast$("Unable to load seminar history.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast$]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const completed = history.filter((h) => h.status === "completed");
  const scheduled = history.filter((h) => h.status === "scheduled");
  const avgScore = completed.length ? Math.round(completed.reduce((a, b) => a + (b.score || 0), 0) / completed.length) : 0;
  const totalStudents = completed.reduce((a, b) => a + (b.students || 0), 0);

  const filtered = history.filter((h) => filter === "all" ? true : h.status === filter);

  return (
    <div className="hist-page route-enter">
      <div className="hist-inner">
        <div className="hist-topbar">
          <div className="hist-title-wrap">
            <div className="hist-logo-ic">🎓</div>
            <div>
              <div className="hist-h1">Seminar History</div>
              <div className="hist-sub">Welcome back{teacherName ? `, ${teacherName}` : ""} — your past and upcoming class sessions</div>
            </div>
          </div>
          <button className="hist-new-btn" onClick={onNewSeminar}>
            <span style={{ fontSize: 16 }}>➕</span> New Seminar
          </button>
        </div>

        <div className="hist-stats-row">
          {[
            { ic: "🎓", v: history.length, l: "Total Sessions" },
            { ic: "✅", v: completed.length, l: "Completed" },
            { ic: "📊", v: `${avgScore}`, l: "Avg. Score" },
            { ic: "🧑‍🎓", v: totalStudents, l: "Students Reached" },
          ].map((s) => (
            <div key={s.l} className="hist-stat-card">
              <div className="hist-stat-ic">{s.ic}</div>
              <div className="hist-stat-v">{s.v}</div>
              <div className="hist-stat-l">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="hist-filter-tabs">
          {[["all", "All"], ["completed", "Completed"], ["scheduled", "Scheduled"]].map(([id, label]) => (
            <button key={id} className={`hist-ftab${filter === id ? " active" : ""}`} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><span className="loader-spin" style={{ borderTopColor: "var(--em)", borderColor: "rgba(0,195,122,.2)" }} /></div>
        ) : filtered.length === 0 ? (
          <div className="hist-empty">
            <div className="hist-empty-ic">🗂️</div>
            <div style={{ fontWeight: 800, color: "var(--t1)", marginBottom: 6 }}>No seminars yet</div>
            <div style={{ fontSize: 12.5, marginBottom: 16 }}>Start your first AI-assisted class seminar to see it appear here.</div>
            <button className="hist-new-btn" style={{ margin: "0 auto" }} onClick={onNewSeminar}>➕ New Seminar</button>
          </div>
        ) : (
          <div className="hist-grid">
            {filtered.map((item) => (
              <div key={item.id} className="hist-card" onClick={() => item.status === "completed" && onOpenResult?.(item)} style={{ cursor: item.status === "completed" ? "pointer" : "default" }}>
                <div className="hist-card-top">
                  <span className={`hist-card-badge ${item.status}`}>{item.status === "completed" ? "✅ Completed" : "📅 Scheduled"}</span>
                  {item.status === "completed" && <span className="hist-card-score">{item.score}/100</span>}
                </div>
                <div className="hist-card-title">{item.topic}</div>
                <div className="hist-card-meta">
                  {item.subject && <span className="hist-chip">📚 {item.subject}</span>}
                  {item.unit && <span className="hist-chip">📖 {item.unit}</span>}
                  {item.status === "completed" && <span className="hist-chip">🧑‍🎓 {item.students} students</span>}
                </div>
                <div className="hist-card-foot">
                  <span>{item.date}{item.time ? ` · ${item.time}` : ""}{item.duration && item.duration !== "—" ? ` · ${item.duration}` : ""}</span>
                  <div className="hist-card-actions">
                    <button className="hist-icon-btn" title="Copy link" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(genRoomLink(item.id)); toast$("Room link copied", "info"); }}>🔗</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {toastNode}
    </div>
  );
}

/* ============================================================================================
   SHARED MODALS
   ============================================================================================ */
function MicPreviewModal({ config, onConfirm, onBack }) {
  const [micGranted, setMicGranted] = useState(false);
  const [micStream, setMicStream] = useState(null);
  const [micChecking, setMicChecking] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinProgress, setJoinProgress] = useState(0);
  const { show: toast$, node: toastNode } = useToast();

  async function requestMic() {
    setMicChecking(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setMicStream(s); setMicGranted(true); toast$("🎤 Microphone active", "success");
    } catch { toast$("Mic permission denied", "error"); }
    finally { setMicChecking(false); }
  }
  async function handleConfirm() {
    setJoining(true);
    for (let p = 0; p <= 100; p += 25) { await new Promise((r) => setTimeout(r, 110)); setJoinProgress(p); }
    setJoining(false);
    onConfirm({ ...config, stream: micStream, micOn: micGranted });
  }
  const presenterColor = avColor(config.name);
  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 400, background: "#0c1422", border: "1px solid rgba(255,255,255,.1)" }}>
        <div style={{ background: "linear-gradient(135deg,#060e1c,#081a10)", padding: "22px 18px", textAlign: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: `${presenterColor}22`, border: `2px solid ${presenterColor}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: presenterColor, margin: "0 auto 10px" }}>{avInit(config.name)}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 3 }}>{config.name}</div>
          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)" }}>{config.seminarMode === "prepare" ? "🤖 AI Preparation Mode" : "🎙️ Class Host"}</div>
        </div>
        <div className="mb" style={{ background: "#0c1422" }}>
          {config.topic && <div style={{ padding: "9px 12px", borderRadius: 10, background: "rgba(0,195,122,.07)", border: "1px solid rgba(0,195,122,.18)", marginBottom: 12, fontSize: 12, fontWeight: 700, color: "#e8ecf2" }}>🎓 "{config.topic}"</div>}
          <div style={{ padding: "12px 13px", borderRadius: 12, border: `1.5px solid ${micGranted ? "rgba(0,195,122,.4)" : "rgba(255,255,255,.12)"}`, background: micGranted ? "rgba(0,195,122,.07)" : "rgba(255,255,255,.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: micGranted ? 0 : 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: micGranted ? "rgba(0,195,122,.2)" : "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{micGranted ? "✅" : "🎤"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: micGranted ? "#5ee3b7" : "#e8ecf2" }}>{micGranted ? "Microphone Active" : "Microphone Required"}</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)" }}>{micGranted ? "Voice transcription enabled" : "Enable your mic to continue"}</div>
              </div>
            </div>
            {!micGranted && <button className="btn-p" onClick={requestMic} disabled={micChecking} style={{ marginTop: 2, fontSize: 12 }}>{micChecking ? <><span className="loader-spin" />Checking…</> : "🎤 Allow Microphone Access"}</button>}
          </div>
        </div>
        <div className="mf" style={{ borderColor: "rgba(255,255,255,.08)", background: "#0c1422", flexDirection: "column", gap: 8 }}>
          <button className="btn-p" onClick={handleConfirm} disabled={joining || !micGranted} style={{ fontSize: 13 }}>
            {joining ? <><span className="loader-spin" />{joinProgress > 0 ? `Loading ${joinProgress}%` : "Launching…"}</> : config.seminarMode === "prepare" ? "🤖 Enter AI Prep Room" : "🎙️ Enter Class Room"}
          </button>
          {joinProgress > 0 && <div className="lo-progress"><div className="lo-progress-fill" style={{ width: `${joinProgress}%` }} /></div>}
          <button className="btn-s" onClick={onBack} disabled={joining} style={{ width: "100%", justifyContent: "center", background: "rgba(255,255,255,.04)", borderColor: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.5)" }}>← Back</button>
        </div>
        {toastNode}
      </div>
    </div>
  );
}

function AnalysisModal({ topic, subject, unit, timer, presenterName, apiScores, onClose, onDownload }) {
  const hasApi = apiScores && apiScores.total_score != null;
  const overall = hasApi ? apiScores.total_score : 0;
  return (
    <div className="analysis-bg" onClick={onClose}>
      <div className="analysis-box" onClick={(e) => e.stopPropagation()}>
        <div className="analysis-head">
          <div className="analysis-title">📊 Class Performance Report</div>
          <button style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", cursor: "pointer", color: "rgba(255,255,255,.5)", fontSize: 11 }} onClick={onClose}>✕</button>
        </div>
        <div className="analysis-body">
          <div className="a-sec">
            <div className="a-sec-title">Session Overview</div>
            <div style={{ padding: "8px 11px", borderRadius: 9, background: "rgba(0,195,122,.07)", border: "1px solid rgba(0,195,122,.16)", fontSize: 12.5, fontWeight: 700, color: "#e8ecf2", marginBottom: 7 }}>"{topic}"</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {[`📚 ${subject || "—"}`, `📖 ${unit || "—"}`, `⏱ ${timer}`].map((t) => <span key={t} style={{ padding: "2px 9px", borderRadius: 20, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.5)" }}>{t}</span>)}
            </div>
          </div>
          <div className="a-sec">
            <div className="a-sec-title">Teacher Performance</div>
            <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 10, padding: "11px 13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: avColor(presenterName || "T") + "22", color: avColor(presenterName || "T"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>{avInit(presenterName || "?")}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#e8ecf2" }}>{presenterName}</div><div style={{ fontSize: 10.5, color: "rgba(255,255,255,.35)" }}>Class Host</div></div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#5ee3b7", textAlign: "right" }}><div>{overall}</div><div style={{ fontSize: 10, fontWeight: 700, color: "var(--t2)", marginTop: 2 }}>TOTAL SCORE</div></div>
              </div>
              {hasApi && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
                  {[
                    { label: "Conceptual Understanding", v: apiScores.conceptual_understanding ?? 0, c: "#00c37a", m: 30 },
                    { label: "Depth of Knowledge", v: apiScores.depth_of_knowledge ?? 0, c: "#2d9cdb", m: 25 },
                    { label: "Presentation Flow", v: apiScores.presentation_flow ?? 0, c: "#7c3aed", m: 20 },
                    { label: "Engagement", v: apiScores.engagement ?? 0, c: "#f6a623", m: 15 },
                  ].map((s) => (
                    <div key={s.label} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: s.c }}>{s.v}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t2)", marginTop: 4, lineHeight: 1.3 }}>{s.label}</div>
                      <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: "rgba(255,255,255,.06)" }}><div style={{ height: "100%", borderRadius: 4, background: s.c, width: `${Math.min(100, (s.v / s.m) * 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {hasApi && (
            <div className="a-sec">
              <div className="a-sec-title">AI Feedback</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {apiScores.overall_feedback && <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", fontSize: 12, color: "rgba(255,255,255,.75)", lineHeight: 1.6 }}>{apiScores.overall_feedback}</div>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {apiScores.strengths?.length > 0 && (
                    <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(0,195,122,.06)", border: "1px solid rgba(0,195,122,.18)" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "var(--em)", marginBottom: 8 }}>✅ Strengths</div>
                      {apiScores.strengths.map((s, i) => <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,.7)", marginBottom: 6, paddingLeft: 8, borderLeft: "2px solid rgba(0,195,122,.4)", lineHeight: 1.4 }}>{s}</div>)}
                    </div>
                  )}
                  {apiScores.improvements?.length > 0 && (
                    <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(229,62,62,.06)", border: "1px solid rgba(229,62,62,.18)" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "var(--red)", marginBottom: 8 }}>🎯 Areas to Improve</div>
                      {apiScores.improvements.map((s, i) => <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,.7)", marginBottom: 6, paddingLeft: 8, borderLeft: "2px solid rgba(229,62,62,.4)", lineHeight: 1.4 }}>{s}</div>)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="a-sec">
            <div className="a-sec-title">Verdict</div>
            <div style={{ padding: "12px 14px", borderRadius: 11, border: "1.5px solid rgba(0,195,122,.35)", background: "rgba(0,195,122,.07)", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#5ee3b7", marginBottom: 2 }}>🏅 {overall >= 85 ? "Outstanding Class Session" : overall >= 70 ? "Strong Delivery" : "Good Effort — Keep Refining"}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.45)" }}>Overall score: {overall}/100</div>
            </div>
          </div>
        </div>
        <div className="analysis-foot">
          <button className="btn-s" style={{ background: "rgba(255,255,255,.04)", borderColor: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.5)" }} onClick={onClose}>Close</button>
          {onDownload && <button className="btn-p" style={{ width: "auto", padding: "7px 15px", fontSize: 12 }} onClick={onDownload}>📥 Download Report</button>}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================================
   SETUP SCREEN
   ============================================================================================ */
function TeacherSeminarSetup({ teacherName, onBack, onLaunch }) {
  const [name, setName] = useState(teacherName || "");
  const [seminarMode, setSeminarMode] = useState(""); // "prepare" | "session"
  const [sessionSubMode, setSessionSubMode] = useState(""); // "host" | "coteach"
  const [subjectCatalog, setSubjectCatalog] = useState([]);
  const [subject, setSubject] = useState("");
  const [unit, setUnit] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [topicOptions, setTopicOptions] = useState([]);
  const [topic, setTopic] = useState("");
  const [custom, setCustom] = useState("");
  const [seminarType, setSeminarType] = useState("instant");
  const [scheduled, setScheduled] = useState(false);
  const [scheduledInfo, setScheduledInfo] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMicPreview, setShowMicPreview] = useState(false);
  const [joinId, setJoinId] = useState("");
  const roomId = useRef(genId());
  const roomLink = genRoomLink(roomId.current);
  const { show: toast$, node: toastNode } = useToast();
  const finalTopic = topic === "__custom__" ? custom.trim() : topic;

  useEffect(() => {
    getLibrarySubjects().then(setSubjectCatalog).catch(() => toast$("Unable to load subjects.", "warn"));
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!subject) { setTopicOptions([]); return; }
    getSeminarTopics(subject).then((list) => setTopicOptions(list.map((t) => t.topic))).catch(() => setTopicOptions([]));
  }, [subject]);

  const selectedSubjectEntry = subjectCatalog.find((s) => s.subjectGroupKey === subject) || null;
  const availableUnits = selectedSubjectEntry?.units || [];
  const copyLink = () => { navigator.clipboard.writeText(roomLink); setCopied(true); toast$("Link copied", "info"); setTimeout(() => setCopied(false), 2200); };

  const leftFeatures = seminarMode === "prepare"
    ? [{ ic: "🤖", t: "AI Co-Teacher", d: "Rehearse your lesson with live AI guidance" }, { ic: "🎙️", t: "Voice Transcript", d: "Your speech transcribed live in the browser" }, { ic: "📋", t: "Notes Board", d: "AI answers saved as reusable notes" }, { ic: "▶️", t: "Demo Mode", d: "Practice a full run-through with feedback" }]
    : sessionSubMode === "coteach"
    ? [{ ic: "🔗", t: "Join by Link", d: "Enter an existing class room as co-teacher" }, { ic: "💬", t: "Chat", d: "Message the host and students in real time" }, { ic: "🖐️", t: "Speaking Access", d: "Request the floor when you want to jump in" }]
    : [{ ic: "🖥️", t: "Screen Share", d: "Present your slides or board live" }, { ic: "🎙️", t: "Live Transcript", d: "AI transcribes your teaching in real time" }, { ic: "🤖", t: "AI Co-Teacher", d: "Intro, pacing tips, and a full report" }, { ic: "📊", t: "Auto Report", d: "Full class performance analysis" }];

  const steps = seminarMode === "session" && sessionSubMode === "coteach"
    ? [{ label: "Enter your name", done: name.trim().length > 0 }, { label: "Enter a room link or ID", done: joinId.trim().length >= 4 }]
    : [{ label: "Enter your name", done: name.trim().length > 0 }, { label: "Select subject & unit", done: !!subject && !!unit }, { label: "Select topic", done: !!finalTopic }];
  const canLaunch = steps.every((s) => s.done);

  return (
    <div className="sp-setup route-enter">
      <div className="sp-left">
        <div className="sp-grid-lines" /><div className="sp-glow1" /><div className="sp-glow2" />
        <div className="sp-left-inner">
          <div className="sp-logo"><div className="sp-logo-ico">🎓</div><span className="sp-logo-name">SeminarArena</span></div>
          <div className="sp-badge"><div className="sp-badge-dot" />Teacher Setup</div>
          <h2 className="sp-h1">Your class,<br /><span className="hl">your stage.</span></h2>
          <p className="sp-desc">AI-assisted class sessions with voice transcription, screen sharing, student chat & full performance reports.</p>
          <div className="sp-features">
            {leftFeatures.map((f, i) => (
              <div key={f.t} className="sp-feat" style={{ animationDelay: `${0.1 + i * 0.06}s` }}>
                <div className="sp-feat-ic">{f.ic}</div>
                <div><div className="sp-feat-t">{f.t}</div><div className="sp-feat-d">{f.d}</div></div>
              </div>
            ))}
          </div>
          {(subject || finalTopic) && (
            <div className="ctx-chip">
              <div className="ctx-chip-lbl">Session Context</div>
              {subject && <div className="ctx-chip-val">📚 {selectedSubjectEntry?.title || subject}{unit ? ` · ${unit}` : ""}</div>}
              {finalTopic && <div className="ctx-chip-sub">{finalTopic.length > 44 ? `${finalTopic.slice(0, 44)}…` : finalTopic}</div>}
            </div>
          )}
        </div>
      </div>

      <div className="sp-right">
        <div className="sp-right-scroll">
          <div className="sp-right-inner">
            <button className="back-btn" onClick={onBack}>← Back to History</button>
            <h2 className="setup-h">🎓 New Seminar</h2>
            <p className="setup-sub">Prepare privately with AI, or start a live class that students join by link.</p>

            <div className="sec-div">Choose Mode</div>
            <div className="module-grid fi">
              {[{ id: "prepare", ic: "🤖", t: "Prepare with AI", d: "Rehearse your lesson with an AI co-teacher before going live." }, { id: "session", ic: "🔴", t: "Live Class Session", d: "Host a live class with screen share, or join one as a co-teacher." }].map((m) => (
                <div key={m.id} className={`module-card${seminarMode === m.id ? " sel" : ""}`} onClick={() => { setSeminarMode(m.id); setSessionSubMode(""); }}>
                  <div className="mod-ic">{m.ic}</div>
                  <div><div className="mod-title">{m.t}</div><div className="mod-desc">{m.d}</div></div>
                </div>
              ))}
            </div>

            {seminarMode === "session" && (
              <>
                <div className="sec-div">I want to…</div>
                <div className="submode-grid fi">
                  <div className={`submode-card${sessionSubMode === "host" ? " sel" : ""}`} onClick={() => setSessionSubMode("host")}>
                    <div className="submode-ic">🎙️</div><div className="submode-title">Host This Class</div>
                    <div className="submode-desc">Start a room, share your screen, teach live.</div>
                  </div>
                  <div className={`submode-card${sessionSubMode === "coteach" ? " sel" : ""}`} onClick={() => setSessionSubMode("coteach")}>
                    <div className="submode-ic">🔗</div><div className="submode-title">Join as Co-Teacher</div>
                    <div className="submode-desc">Join an existing class room using a link.</div>
                  </div>
                </div>
              </>
            )}

            {seminarMode === "session" && sessionSubMode === "coteach" && (
              <>
                <div className="sec-div">Join a Room</div>
                <div className="fi"><label className="fl">Room Link or ID</label><input className="finput" placeholder="Paste room link or enter Room ID…" value={joinId} onChange={(e) => setJoinId(e.target.value)} /></div>
                <div className="sec-div">Your Name</div>
                <div className="fi"><input className="finput" placeholder="e.g. Mr. Alan Reyes" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} /></div>
              </>
            )}

            {(seminarMode === "prepare" || (seminarMode === "session" && sessionSubMode === "host")) && (
              <>
                <div className="sec-div">Your Identity</div>
                <div className="fi"><label className="fl">Your Name</label><input className="finput" placeholder="e.g. Mr. Alan Reyes" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} /></div>

                <div className="sec-div">Class Context</div>
                <div className="fi-row fi">
                  <div><label className="fl">Subject</label>
                    <select className="finput" value={subject} onChange={(e) => { setSubject(e.target.value); setUnit(""); setSelectedUnitId(""); setTopic(""); }}>
                      <option value="">Select subject…</option>
                      {subjectCatalog.map((s) => <option key={s.subjectGroupKey} value={s.subjectGroupKey}>{s.title}</option>)}
                    </select>
                  </div>
                  <div><label className="fl">Unit</label>
                    <select className="finput" value={selectedUnitId} onChange={(e) => { const id = e.target.value; setSelectedUnitId(id); const u = availableUnits.find((x) => x.id === id); setUnit(u?.unitTitle || ""); }} disabled={!subject}>
                      <option value="">{subject ? "Select unit…" : "Subject first"}</option>
                      {availableUnits.map((u) => <option key={u.id} value={u.id}>{u.unitTitle}</option>)}
                    </select>
                  </div>
                </div>

                <div className="sec-div">Class Topic</div>
                <div className="fi">
                  <select className="finput" value={topic} onChange={(e) => setTopic(e.target.value)}>
                    <option value="">Select a topic…</option>
                    {topicOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                    <option value="__custom__">✏️ Custom topic…</option>
                  </select>
                </div>
                {topic === "__custom__" && <div className="fi"><input className="finput" placeholder="Enter your topic…" value={custom} onChange={(e) => setCustom(e.target.value)} /></div>}

                {seminarMode === "session" && sessionSubMode === "host" && (
                  <>
                    <div className="sec-div">Session Timing</div>
                    <div className="timing-grid fi">
                      {[{ id: "instant", ic: "⚡", t: "Start Now", d: "Launch immediately" }, { id: "schedule", ic: "📅", t: "Schedule", d: "Plan for a future date" }].map((o) => (
                        <div key={o.id} className={`timing-card${seminarType === o.id ? " sel" : ""}`} onClick={() => setSeminarType(o.id)}>
                          <div className="timing-ic">{o.ic}</div><div><div className="timing-title">{o.t}</div><div className="timing-desc">{o.d}</div></div>
                        </div>
                      ))}
                    </div>
                    {seminarType === "schedule" && (
                      <div style={{ padding: "11px 13px", borderRadius: 11, background: "rgba(0,195,122,.04)", border: "1.5px solid rgba(0,195,122,.16)", marginBottom: 10 }}>
                        {!scheduled ? (
                          <>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t1)", marginBottom: 5 }}>📅 Schedule this class</div>
                            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 8 }}>It will appear as "Scheduled" in your History until then.</div>
                            <button className="btn-s" style={{ width: "100%", justifyContent: "center" }} onClick={() => setShowSchedule(true)}>📅 Set Date & Time</button>
                          </>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                            <span style={{ fontSize: 20 }}>✅</span>
                            <div style={{ flex: 1 }}><div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--em)" }}>Scheduled</div><div style={{ fontSize: 10.5, color: "var(--t2)" }}>📅 {scheduledInfo?.date} at {scheduledInfo?.time}</div></div>
                            <button className="btn-s" style={{ fontSize: 10.5, padding: "3px 8px" }} onClick={() => { setScheduled(false); setShowSchedule(true); }}>Edit</button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="link-box">
                      <div className="link-lbl">🔗 Your Room Link — Share with Students</div>
                      <div className="link-row"><span className="link-val">{roomLink}</span><button className="copy-btn" onClick={copyLink}>{copied ? "✓ Copied" : "Copy"}</button></div>
                    </div>
                  </>
                )}

                <div style={{ marginTop: 14, marginBottom: 10 }}>
                  <div className="steps">
                    {steps.map((s, i) => {
                      const done = s.done;
                      const prev = steps.slice(0, i).every((x) => x.done);
                      const act = !done && prev;
                      return <div key={i} className={`step-r ${done ? "done" : act ? "act" : "pend"}`}><div className="step-num">{done ? "✓" : i + 1}</div><div className="step-lbl">{s.label}</div></div>;
                    })}
                  </div>
                  {seminarType !== "schedule" && (
                    <button className="btn-p" onClick={() => setShowMicPreview(true)} disabled={!canLaunch}>
                      {seminarMode === "prepare" ? "🤖 Start AI Preparation" : "🎙️ Launch Class Room"}
                    </button>
                  )}
                  {seminarType === "schedule" && scheduled && (
                    <button className="btn-p" style={{ background: "var(--surf3)", color: "var(--t2)", boxShadow: "none" }} disabled>📅 Scheduled — appears in History</button>
                  )}
                </div>
              </>
            )}

            {seminarMode === "session" && sessionSubMode === "coteach" && (
              <div style={{ marginTop: 14 }}>
                <button className="btn-p" onClick={() => setShowMicPreview(true)} disabled={!canLaunch}>🔗 Join Class Room</button>
              </div>
            )}

            <div style={{ height: 20 }} />
          </div>
        </div>
      </div>

      {showSchedule && (
        <div className="overlay" onClick={() => setShowSchedule(false)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="mh"><span className="mh-title">📅 Schedule Class</span><button className="mh-close" onClick={() => setShowSchedule(false)}>✕</button></div>
            <ScheduleBody onSave={(info) => { setScheduledInfo(info); setScheduled(true); setShowSchedule(false); toast$("📅 Class scheduled!", "success"); }} onClose={() => setShowSchedule(false)} />
          </div>
        </div>
      )}

      {showMicPreview && (
        <MicPreviewModal
          config={{ seminarMode, sessionSubMode, name, subject: selectedSubjectEntry?.title || subject, unit, topic: finalTopic, roomId: roomId.current, roomLink }}
          onConfirm={async (cfg) => {
            setShowMicPreview(false);
            const candidate = getCandidateContext({ firstName: cfg.name });
            try {
              if (cfg.seminarMode === "session" && cfg.sessionSubMode === "coteach") {
                const parsedId = joinId.includes("room=") ? joinId.split("room=")[1] : joinId;
                const joined = await joinSeminarSession({ sessionId: parsedId, candidateId: candidate.candidateId, candidateName: cfg.name, role: "observer" });
                onLaunch({ ...cfg, candidateId: candidate.candidateId, role: "Co-Teacher", sessionId: parsedId, liveSession: joined.liveSession, roomLink: joined.shareLink, subject: joined.subject, unit: joined.unit, topic: joined.topic, seminarMode: "session", sessionSubMode: "coteach" });
                return;
              }
              if (cfg.seminarMode === "session" && cfg.sessionSubMode === "host") {
                const room = await createSeminarRoom({ sessionId: roomId.current, roomLink, candidateId: candidate.candidateId, candidateName: cfg.name, topic: finalTopic, subject: selectedSubjectEntry?.title || subject, unit });
                onLaunch({ ...cfg, candidateId: candidate.candidateId, role: "Host", sessionId: room.sessionId, roomId: room.sessionId, liveSession: room.liveSession, seminarMode: "session", sessionSubMode: "host" });
                return;
              }
              // prepare with AI
              const started = await startSeminar({ unitId: selectedUnitId, candidateId: candidate.candidateId, candidateName: cfg.name, topic: finalTopic, subject: selectedSubjectEntry?.title || subject, unitName: unit, mode: "practice" });
              onLaunch({ ...cfg, candidateId: candidate.candidateId, role: "Teacher", sessionId: started.sessionId, initialGreeting: started.ai_greeting, seminarMode: "prepare" });
            } catch (err) {
              toast$(getErrorMessage(err, "Unable to launch this seminar."), "error");
            }
          }}
          onBack={() => setShowMicPreview(false)}
        />
      )}
      {toastNode}
    </div>
  );
}

function ScheduleBody({ onSave, onClose }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!date) return;
    setSaving(true);
    await delay(500); // simulate save
    setSaving(false);
    onSave({ date, time });
  }
  return (
    <>
      <div className="mb">
        <div className="fi-row fi">
          <div><label className="fl">Date *</label><input className="finput" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><label className="fl">Time</label><input className="finput" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        </div>
      </div>
      <div className="mf">
        <button className="btn-s" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn-p" style={{ width: "auto", padding: "8px 20px" }} onClick={save} disabled={!date || saving}>{saving ? <><span className="loader-spin" />Scheduling…</> : "📅 Schedule"}</button>
      </div>
    </>
  );
}

/* ============================================================================================
   PREPARE WITH AI ROOM
   ============================================================================================ */
function PrepareWithAIRoom({ config, onEnd }) {
  const timer = usePausableTimer();
  const [micOn, setMicOn] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [activePanel, setActivePanel] = useState("chat");
  const [messages, setMessages] = useState([{ from: "ai", text: config.initialGreeting || `Welcome! I'm your AI co-teacher for "${config.topic}". Whenever you're ready, start walking through your lesson and I'll help keep the pace on track.` }]);
  const [notes, setNotes] = useState([
    { id: 1, n: 1, q: "What structure should my class follow?", a: AI_RESPONSES.outline, open: false },
    { id: 2, n: 2, q: "What are key delivery tips?", a: AI_RESPONSES.feedback, open: false },
  ]);
  const [noteCount, setNoteCount] = useState(2);
  const [aiInput, setAiInput] = useState("");
  const [isAITyping, setIsAITyping] = useState(false);
  const [isStudentSpeaking, setIsStudentSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [transcriptHistory, setTranscriptHistory] = useState([]);
  const [voiceListening, setVoiceListening] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoTimer, setDemoTimer] = useState(0);
  const [endingSession, setEndingSession] = useState(false);
  const chatEndRef = useRef(null);
  const demoIntervalRef = useRef(null);
  const speech = useSpeechRecognition();
  const voiceAsk = useSpeechRecognition();
  const aiVoice = useAIVoice();
  const { show: toast$, node: toastNode } = useToast();
  const presenterColor = avColor(config.name);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    // speak the opening greeting once
    aiVoice.speak(messages[0].text);
    return () => { aiVoice.cancel(); speech.stop(); voiceAsk.stop(); if (demoIntervalRef.current) clearInterval(demoIntervalRef.current); };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!demoRunning) return;
    const id = setInterval(() => setDemoTimer((t) => t + 1), 1000);
    demoIntervalRef.current = id;
    return () => clearInterval(id);
  }, [demoRunning]);

  function toggleMic() {
    if (!micOn) {
      setMicOn(true);
      speech.start((finalText) => {
        setTranscriptHistory((h) => [...h, finalText].slice(-30));
        setLiveTranscript(finalText);
        setIsStudentSpeaking(true);
        setTimeout(() => setIsStudentSpeaking(false), 1400);
      });
      toast$("🎤 Microphone on — start talking", "info");
    } else {
      setMicOn(false);
      speech.stop();
      toast$("🔇 Microphone muted", "warn");
    }
  }

  function addNote(q, a) {
    setNoteCount((c) => { const nc = c + 1; setNotes((prev) => [{ id: nc, n: nc, q, a, open: false }, ...prev]); return nc; });
  }
  function toggleNote(id) { setNotes((ns) => ns.map((n) => n.id === id ? { ...n, open: !n.open } : n)); }

  async function sendAI(text = aiInput) {
    const q = text.trim();
    if (!q) return;
    setMessages((m) => [...m, { from: "me", text: q }]);
    setAiInput("");
    setIsAITyping(true);
    try {
      const res = await respondSeminar({ sessionId: config.sessionId, message: q }); // 🔌 mock -> POST /seminar/respond
      const reply = res.ai_response;
      setMessages((m) => [...m, { from: "ai", text: reply }]);
      addNote(q.length > 55 ? `${q.slice(0, 55)}…` : q, reply);
      aiVoice.speak(reply);
    } catch {
      toast$("The AI didn't respond — try again.", "error");
    } finally {
      setIsAITyping(false);
    }
  }

  function toggleVoiceAsk() {
    if (voiceListening) {
      voiceAsk.stop(); setVoiceListening(false);
      if (voiceAsk.transcript.trim()) sendAI(voiceAsk.transcript.trim());
    } else {
      setVoiceListening(true);
      voiceAsk.start((finalText) => { voiceAsk.stop(); setVoiceListening(false); sendAI(finalText); });
      toast$("🎙️ Listening — speak your question", "info");
    }
  }

  function startDemo() {
    setDemoMode(true); setDemoRunning(true); setDemoTimer(0);
    const msg = `Demo mode started. Teach "${config.topic}" as if to a live class — I'll evaluate your pacing, clarity, and structure.`;
    setMessages((m) => [...m, { from: "system", text: "▶️ Demo Mode Started" }, { from: "ai", text: msg }]);
    aiVoice.speak(msg);
    toast$("▶️ Demo started", "info");
  }
  function stopDemo() {
    setDemoMode(false); setDemoRunning(false);
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    const fa = AI_RESPONSES.feedback;
    setMessages((m) => [...m, { from: "system", text: "🏁 Demo Complete" }, { from: "ai", text: fa }]);
    addNote("Demo feedback", fa);
    toast$("🏁 Demo ended", "success");
  }

  function handleDownloadPDF() { downloadSessionPDF({ config, timer: timer.display, transcriptHistory, notes, messages }); toast$("📥 Report downloaded!", "success"); }

  async function handleEndSession() {
    if (endingSession) return;
    setEndingSession(true);
    speech.stop(); voiceAsk.stop(); aiVoice.cancel();
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    let scores = null;
    try {
      const res = await endSeminarWithTranscript({ sessionId: config.sessionId, transcript: transcriptHistory.join("\n") }); // 🔌 mock -> POST /seminar/end
      scores = res.scores;
    } catch { toast$("Unable to end cleanly — saving locally.", "warn"); }
    onEnd({ modeType: "prepare", timer: timer.display, topic: config.topic, subject: config.subject, unit: config.unit, presenterName: config.name, transcriptHistory, notes, messages, scores, sessionId: config.sessionId, canViewFeedback: true });
  }

  const demoTimerStr = `${String(Math.floor(demoTimer / 60)).padStart(2, "0")}:${String(demoTimer % 60).padStart(2, "0")}`;

  return (
    <div className="prep-page">
      <div className="prep-bar">
        <button className="prep-bar-logo"><div className="prep-bar-logo-ic">🎓</div><span>SeminarArena</span></button>
        <div className="prep-bar-div" />
        <div className="prep-bar-topic"><strong>{config.subject && `${config.subject}${config.unit ? ` · ${config.unit}` : ""} · `}</strong>{config.topic}</div>
        {demoMode && <div className={`prep-pill ${demoRunning ? "pp-demo" : "pp-paused"}`}>{demoRunning ? `▶️ DEMO ${demoTimerStr}` : `⏸ DEMO PAUSED ${demoTimerStr}`}</div>}
        {!demoMode && <div className="prep-pill pp-mode">🤖 AI Co-Teacher</div>}
        <div className={`prep-pill ${timer.isPaused ? "pp-paused" : "pp-timer"}`}>{timer.isPaused ? "⏸ PAUSED" : timer.display}</div>
        <button className="prep-bar-end" onClick={() => setShowEnd(true)}>End</button>
      </div>

      <div className={`prep-body ${panelOpen ? "panel-open" : "panel-closed"}`}>
        <div className="prep-main-area">
          <div className="prep-stage">
            <div className="prep-tiles-grid">
              <div className={`prep-tile${isStudentSpeaking && !timer.isPaused ? " speaking" : ""}`}>
                <div className="prep-tile-you-badge">YOU</div>
                <div className="prep-tile-av" style={{ background: `${presenterColor}22`, color: presenterColor }}>{avInit(config.name)}</div>
                <div className="prep-tile-name">{config.name}</div>
                <div className="prep-tile-role">Teacher</div>
                {isStudentSpeaking && !timer.isPaused && <div className="prep-tile-analyser"><SoundAnalyser active color="#5ee3b7" bars={5} size={14} /></div>}
                {!micOn && <div className="prep-tile-muted">🔇</div>}
              </div>
              <div className={`prep-tile${aiVoice.isSpeaking && !timer.isPaused ? " speaking-ai" : ""}`}>
                <div className="prep-tile-ai-badge">AI</div>
                <div className="prep-tile-ai-icon">🤖</div>
                <div className="prep-tile-name">AI Co-Teacher</div>
                <div className="prep-tile-role">Powered by SeminarArena</div>
                {aiVoice.isSpeaking && !timer.isPaused && <div className="prep-tile-analyser"><SoundAnalyser active color="#7ed3f7" bars={5} size={14} /></div>}
                {isAITyping && !aiVoice.isSpeaking && !timer.isPaused && <div className="prep-tile-typing">{[0, 1, 2].map((i) => <div key={i} className="prep-tile-typing-dot" style={{ animationDelay: `${i * .22}s` }} />)}</div>}
              </div>
            </div>

            {timer.isPaused && (
              <div className="paused-overlay">
                <div className="paused-badge"><span style={{ fontSize: 20 }}>⏸</span> Session Paused</div>
                <div className="paused-sub">Resume when you're ready to continue.</div>
                <button className="paused-resume-btn" onClick={() => { timer.resume(); toast$("▶ Resumed", "success"); }}>▶ Resume Session</button>
              </div>
            )}

            {!timer.isPaused && (
              <div className="prep-live-transcript">
                <div className="plt-label"><div className="plt-dot" />Live Voice Transcript</div>
                <div className="plt-text">
                  {liveTranscript ? liveTranscript : transcriptHistory.length > 0 ? transcriptHistory[transcriptHistory.length - 1] : <span className="plt-empty">Turn on your mic to see your live transcript…</span>}
                </div>
              </div>
            )}

            <button className="panel-toggle-fab" onClick={() => setPanelOpen((p) => !p)}>{panelOpen ? "›" : "‹"}</button>
          </div>

          <div className="prep-ctrl-bar">
            <div className="prep-ctrl-user-info">
              <div className="prep-ctrl-av" style={{ background: `${presenterColor}22`, color: presenterColor }}>{avInit(config.name)}</div>
              <div className="prep-ctrl-details"><div className="prep-ctrl-name">{config.name}</div><div className="prep-ctrl-sub">{config.subject}{config.unit ? ` · ${config.unit}` : ""}</div></div>
            </div>
            <div className="prep-ctrl-center">
              <button className={`cbtn ${micOn ? "on" : "off"}`} onClick={toggleMic} disabled={timer.isPaused}><span className="cbtn-ic">{micOn ? "🎤" : "🔇"}</span><span>{micOn ? "Mute" : "Unmute"}</span></button>
              {!demoMode ? (
                <button className="cbtn em" onClick={startDemo} disabled={timer.isPaused}><span className="cbtn-ic">▶</span><span>Start Demo</span></button>
              ) : demoRunning ? (
                <button className="cbtn rec" onClick={stopDemo}><span className="cbtn-ic">🏁</span><span>End Demo</span></button>
              ) : (
                <button className="cbtn em" onClick={() => setDemoRunning(true)}><span className="cbtn-ic">▶</span><span>Resume</span></button>
              )}
              <button className={timer.isPaused ? "cbtn em" : "cbtn pause-btn"} onClick={() => timer.isPaused ? timer.resume() : timer.pause()}><span className="cbtn-ic">{timer.isPaused ? "▶" : "⏸"}</span><span>{timer.isPaused ? "Resume" : "Pause"}</span></button>
            </div>
            <div className="prep-ctrl-right">
              <button className={`cbtn${activePanel === "chat" && panelOpen ? " hi" : ""}`} onClick={() => { setActivePanel("chat"); setPanelOpen(true); }}><span className="cbtn-ic">🤖</span><span>Chat</span></button>
              <button className={`cbtn${activePanel === "notes" && panelOpen ? " hi" : ""}`} onClick={() => { setActivePanel("notes"); setPanelOpen(true); }}><span className="cbtn-ic">📋</span><span>Notes</span></button>
              <button className="end-room-btn" onClick={() => setShowEnd(true)}>End</button>
            </div>
          </div>
        </div>

        {panelOpen && (
          <div className="prep-side-panel">
            <div className="prep-panel-header">
              <div className="prep-panel-tabs">
                {[{ id: "chat", ic: "🤖", lbl: "AI Chat" }, { id: "notes", ic: "📋", lbl: "Notes" }].map((t) => (
                  <button key={t.id} className={`prep-ptab${activePanel === t.id ? " active" : ""}`} onClick={() => setActivePanel(t.id)}><span style={{ fontSize: 13 }}>{t.ic}</span><span>{t.lbl}</span></button>
                ))}
              </div>
              <button className="prep-panel-close" onClick={() => setPanelOpen(false)}>✕</button>
            </div>

            {activePanel === "chat" && (
              <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, overflow: "hidden" }}>
                <div className="prep-panel-scroll" style={{ flex: 1 }}>
                  <div className="prep-ai-msgs">
                    {messages.map((m, i) => {
                      if (m.from === "system") return <div key={i} style={{ display: "flex", justifyContent: "center", width: "100%", marginBottom: 4 }}><div className="prep-ai-bubble system-style">{m.text}</div></div>;
                      return (
                        <div key={i} className={`prep-ai-msg ${m.from === "ai" ? "from-ai" : "from-me"}`}>
                          <div className={`prep-ai-bubble-av ${m.from === "ai" ? "ai-side" : "me-side"}`}>{m.from === "ai" ? "🤖" : avInit(config.name)}</div>
                          <div className={`prep-ai-bubble ${m.from === "ai" ? "ai-style" : "me-style"}`} style={{ whiteSpace: "pre-line" }}>{m.text}</div>
                        </div>
                      );
                    })}
                    {isAITyping && <div className="prep-ai-msg from-ai"><div className="prep-ai-bubble-av ai-side">🤖</div><div className="prep-ai-typing">{[0, 1, 2].map((i) => <div key={i} className="prep-ai-typing-dot" style={{ animationDelay: `${i * .22}s` }} />)}</div></div>}
                    <div ref={chatEndRef} />
                  </div>
                </div>
                <div className="prep-ai-speaking-row">
                  {aiVoice.isSpeaking ? <><SoundAnalyser active color="#7ed3f7" bars={5} size={18} /><span className="prep-ai-speaking-text">AI Co-Teacher speaking…</span></> : <span className="prep-ai-speaking-text" style={{ color: "rgba(255,255,255,.2)" }}>AI Co-Teacher ready</span>}
                </div>
                <div className="quick-prompts">{["Outline", "Script", "Questions", "Examples", "Feedback"].map((qp) => <button key={qp} className="quick-p" onClick={() => sendAI(qp)}>{qp}</button>)}</div>
                <div className="prep-ai-input-area">
                  <div className="prep-ai-input-row">
                    <button className={`prep-ai-voice-btn${voiceListening ? " listening" : ""}`} onClick={toggleVoiceAsk}>{voiceListening ? "⏹" : "🎙️"}</button>
                    <textarea className="prep-ai-input" placeholder="Ask AI co-teacher…" value={voiceListening ? (voiceAsk.transcript || "") : aiInput} onChange={(e) => { if (!voiceListening) setAiInput(e.target.value); }} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAI(); } }} rows={1} readOnly={voiceListening} />
                    <button className="prep-ai-send" onClick={() => sendAI()} disabled={isAITyping || (!aiInput.trim() && !voiceListening)}>➤</button>
                  </div>
                </div>
              </div>
            )}

            {activePanel === "notes" && (
              <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                <div className="prep-notes-header"><span className="prep-notes-title">📋 AI Notes & Q&A</span><span className="prep-notes-count">{notes.length} notes</span></div>
                <div className="prep-panel-scroll" style={{ flex: 1 }}>
                  <div className="prep-faq-list">
                    {notes.map((note) => (
                      <div key={note.id} className="prep-faq-item">
                        <div className="prep-faq-q" onClick={() => toggleNote(note.id)}>
                          <div style={{ flex: 1 }}><div className="prep-faq-num">Note {note.n}</div><div className="prep-faq-q-text">{note.q}</div></div>
                          <span className={`prep-faq-chevron${note.open ? " open" : ""}`}>▼</span>
                        </div>
                        {note.open && <div className="prep-faq-a">{note.a}</div>}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,.07)" }}>
                  <button className="prep-action-btn" style={{ marginBottom: 0 }} onClick={handleDownloadPDF}>📥 Download All Notes</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showAnalysis && <AnalysisModal topic={config.topic} subject={config.subject} unit={config.unit} timer={timer.display} presenterName={config.name} onClose={() => setShowAnalysis(false)} onDownload={handleDownloadPDF} />}

      {showEnd && (
        <div className="overlay" onClick={() => setShowEnd(false)}>
          <div className="modal" style={{ maxWidth: 360, background: "#0c1422", border: "1px solid rgba(255,255,255,.1)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ background: "linear-gradient(135deg,#060e1c,#08180e)", padding: "22px 18px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 9 }}>🏁</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 4 }}>End preparation session?</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.38)", lineHeight: 1.7 }}>Duration: <strong style={{ color: "#5ee3b7" }}>{timer.display}</strong><br />{notes.length} notes saved</div>
            </div>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              <button className="prep-action-btn" style={{ marginBottom: 0 }} onClick={handleDownloadPDF}>📥 Download Session Report First</button>
            </div>
            <div className="mf" style={{ borderColor: "rgba(255,255,255,.08)", background: "#0c1422" }}>
              <button className="btn-s" style={{ background: "rgba(255,255,255,.04)", borderColor: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.5)" }} onClick={() => setShowEnd(false)}>Keep Going</button>
              <button className="btn-d" onClick={handleEndSession} disabled={endingSession}>{endingSession ? "Ending..." : "End Session"}</button>
            </div>
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}

/* ============================================================================================
   LIVE CLASS ROOM — Host (Teacher)
   ============================================================================================ */
function TeacherLiveRoom({ config, onEnd }) {
  const timer = useTimer(true);
  const [panelTab, setPanelTab] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [reaction, setReaction] = useState(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [studentCount, setStudentCount] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ending, setEnding] = useState(false);
  const chatEndRef = useRef(null);
  const aiIntervalRef = useRef(null);
  const aiVoice = useAIVoice();
  const speech = useSpeechRecognition();
  const { show: toast$, node: toastNode } = useToast();
  const presenterColor = avColor(config.name);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  function addMsg(sender, text, type) { setMessages((ms) => [...ms, { sender, text, type, time: Date.now() }]); }

  useEffect(() => {
    startSeminarRoom({ sessionId: config.sessionId, unitId: config.unitId, candidateId: config.candidateId, candidateName: config.name, topic: config.topic }); // 🔌 mock -> POST /seminar/room/start
    speech.start((ft) => { setLiveTranscript(ft); setIsSpeaking(true); setTimeout(() => { setLiveTranscript(""); setIsSpeaking(false); }, 4500); });
    const intro = `Welcome to your class on "${config.topic}"${config.subject ? ` — ${config.subject}` : ""}! I'm your AI co-teacher. Share your screen and begin whenever you're ready.`;
    setTimeout(() => { addMsg("AI Co-Teacher", intro, "ai"); aiVoice.speak(intro); }, 700);
    aiIntervalRef.current = setInterval(() => {
      if (Math.random() > 0.65 && !aiVoice.isSpeaking) {
        const tip = ["Great explanation — consider checking in with a quick question.", "Try pausing here to let the concept land before moving on.", "You're covering this well — a real-world example could reinforce it.", "Remember to invite questions from the class."][Math.floor(Math.random() * 4)];
        addMsg("AI Co-Teacher", tip, "ai");
      }
      if (Math.random() > 0.75) setStudentCount((c) => Math.min(c + 1, 40));
    }, 22000);
    return () => { if (aiIntervalRef.current) clearInterval(aiIntervalRef.current); aiVoice.cancel(); speech.stop(); if (config.stream?.getTracks) config.stream.getTracks().forEach((t) => t.stop()); };
  }, []); // eslint-disable-line

  useEffect(() => { if (speech.transcript) { setLiveTranscript(speech.transcript); setIsSpeaking(true); } }, [speech.transcript]);

  async function toggleScreen() {
    if (screenSharing) { setScreenSharing(false); toast$("🖥 Screen sharing stopped", "warn"); return; }
    try { await navigator.mediaDevices.getDisplayMedia({ video: true }); setScreenSharing(true); toast$("🖥 Screen sharing started", "success"); addMsg("AI Co-Teacher", "Screen sharing is active. Students can see your content — begin when ready!", "ai"); }
    catch { toast$("Screen share cancelled", "warn"); }
  }

  function sendMsg(text) {
    if (!text.trim()) return;
    addMsg(config.name, text.trim());
    sendSeminarMessage({ sessionId: config.sessionId, candidateName: config.name, message: text.trim(), role: "host" }); // 🔌 mock -> POST /seminar/chat/send
    setChatInput("");
  }
  function sendReaction(emoji) { setShowReactions(false); const k = Date.now(); setReaction({ emoji, k }); setTimeout(() => setReaction(null), 2400); }

  async function handleEnd() {
    setEnding(true);
    if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
    aiVoice.cancel(); speech.stop();
    if (config.stream?.getTracks) config.stream.getTracks().forEach((t) => t.stop());
    let scores = null;
    try { const res = await endSeminarWithTranscript({ sessionId: config.sessionId, transcript: liveTranscript }); scores = res.scores; } catch {}
    onEnd({ timer, topic: config.topic, subject: config.subject, unit: config.unit, presenterName: config.name, scores, sessionId: config.sessionId, modeType: "session", canViewFeedback: true });
  }
  const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="room-page">
      <div className="room-bar">
        <div className="room-logo"><div className="room-logo-ic">🎓</div>SeminarArena</div>
        <div className="room-divider" />
        <div className="room-topic"><strong>{config.subject && `${config.subject}${config.unit ? ` · ${config.unit}` : ""} · `}</strong>{config.topic}</div>
        <div className="r-pill rp-timer">{timer}</div>
        <div className="r-pill rp-ai">🤖 AI Co-Teacher</div>
        <div className="r-pill" style={{ background: "rgba(0,195,122,.1)", borderColor: "rgba(0,195,122,.2)", color: "#5ee3b7" }}>🧑‍🎓 {studentCount}</div>
        <button className="rbar-end-btn" onClick={() => setShowEnd(true)}>✕ End</button>
      </div>
      <div className="room-body">
        <div className="grid-area">
          <div className="ss-area">
            {!screenSharing ? (
              <div className="ss-placeholder"><div style={{ fontSize: 52, opacity: .18 }}>🖥️</div><div style={{ fontSize: 13, fontWeight: 700 }}>Screen not shared yet</div><button style={{ marginTop: 14, padding: "9px 20px", borderRadius: 10, background: "var(--grad)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#fff" }} onClick={toggleScreen}>🖥️ Start Screen Share</button></div>
            ) : (
              <><div className="ss-active-label"><div className="ss-active-dot" />Screen Sharing Active · {studentCount} watching</div><div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>Your screen is shared</div></>
            )}
            {reaction && <div key={reaction.k} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 46, animation: "rPop 2s forwards", pointerEvents: "none", zIndex: 5 }}>{reaction.emoji}</div>}
          </div>
          <div className="presenter-strip">
            <div className="strip-tile" style={{ border: `1.5px solid ${presenterColor}44` }}>
              <div className="strip-av" style={{ background: presenterColor + "22", color: presenterColor }}>{avInit(config.name)}</div>
              {isSpeaking && <div style={{ position: "absolute", top: 5, right: 5 }}><SoundAnalyser active color="#5ee3b7" bars={4} size={16} /></div>}
              <div className="strip-ov"><span className="strip-name">{config.name}</span><span style={{ fontSize: 9 }}>{micOn ? "🎤" : "🔇"}</span></div>
              <div style={{ position: "absolute", top: 5, left: 5, fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4, background: "rgba(0,195,122,.85)", color: "#000" }}>TEACHER</div>
            </div>
            <div className="strip-tile" style={{ border: "1.5px solid rgba(45,156,219,.3)" }}>
              <div style={{ fontSize: 24 }}>🤖</div>
              <div className="strip-ov"><span className="strip-name">AI Co-Teacher</span></div>
            </div>
            {studentCount > 0 && (<div className="strip-tile"><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><div style={{ fontSize: 20 }}>🧑‍🎓</div><div style={{ fontSize: 16, fontWeight: 900, color: "rgba(255,255,255,.6)" }}>{studentCount}</div></div><div className="strip-ov"><span className="strip-name">Students</span></div></div>)}
          </div>
          {(speech.isListening || liveTranscript) && (<div className="live-transcript-bar"><div className="lt-label"><div className="lt-dot" />Live Transcript</div><div className="lt-text">{liveTranscript || "Listening…"}</div></div>)}
          <div className="ctrl-bar">
            <div className="cg">
              <button className={`cbtn ${micOn ? "on" : "off"}`} onClick={() => { const n = !micOn; setMicOn(n); toast$(n ? "🎤 Mic enabled" : "🔇 Mic muted", n ? "info" : "warn"); }}><span className="cbtn-ic">{micOn ? "🎤" : "🔇"}</span><span>{micOn ? "Mute" : "Unmute"}</span></button>
              <button className={`cbtn${screenSharing ? " hi" : ""}`} onClick={toggleScreen}><span className="cbtn-ic">🖥</span><span>{screenSharing ? "Stop" : "Share"}</span></button>
              <div style={{ position: "relative" }}>
                <button className={`cbtn${showReactions ? " hi" : ""}`} onClick={() => setShowReactions((r) => !r)}><span className="cbtn-ic">😊</span><span>React</span></button>
                {showReactions && <div className="react-pop">{REACTIONS.map((r) => <button key={r} className="react-em" onClick={() => sendReaction(r)}>{r}</button>)}</div>}
              </div>
            </div>
            <div className="cg">
              <button className="cbtn em" onClick={() => setShowAnalysis(true)}><span className="cbtn-ic">📊</span><span>Report</span></button>
              <button className={`cbtn${panelTab === "chat" ? " hi" : ""}`} onClick={() => setPanelTab((p) => p === "chat" ? null : "chat")}><span className="cbtn-ic">💬</span><span>Chat</span></button>
              <button className="end-room-btn-sm" onClick={() => setShowEnd(true)}>End Class</button>
            </div>
          </div>
        </div>
        {panelTab && (
          <div className="side-panel">
            <div className="panel-tabs"><button className="ptab active"><span style={{ fontSize: 12 }}>💬</span><span>Chat</span></button></div>
            <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
              <div className="pscroll" style={{ flex: 1 }}>
                <div className="chat-msgs">
                  {messages.length === 0 && <div className="chat-empty">No messages yet.<br />Student questions appear here.</div>}
                  {messages.map((m, i) => { const own = m.sender === config.name; const isAI = m.type === "ai"; return (
                    <div key={i} className={`chat-msg${own ? " own" : ""}`}>
                      {!own && <div className="chat-av-s" style={{ background: isAI ? "rgba(45,156,219,.2)" : "rgba(255,255,255,.08)", color: isAI ? "#7ed3f7" : "rgba(255,255,255,.5)" }}>{isAI ? "🤖" : m.sender[0]?.toUpperCase()}</div>}
                      <div className="chat-bw">
                        {!own && <span className="chat-sender">{m.sender}</span>}
                        <div className={`chat-bubble ${own ? "b-own" : ""}`} style={isAI ? { background: "rgba(45,156,219,.09)", border: "1px solid rgba(45,156,219,.15)", color: "#d0e8ff", borderRadius: "3px 9px 9px 9px" } : !own ? { background: "rgba(255,255,255,.07)", color: "#e8ecf2", border: "1px solid rgba(255,255,255,.07)", borderRadius: "3px 9px 9px 9px" } : {}}>{m.text}</div>
                        <span className="chat-t">{fmt(m.time)}</span>
                      </div>
                    </div>
                  ); })}
                  <div ref={chatEndRef} />
                </div>
              </div>
              <div className="chat-ia">
                <textarea className="chat-inp" placeholder="Reply to students…" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(chatInput); } }} rows={1} />
                <button className="chat-send" onClick={() => sendMsg(chatInput)}>➤</button>
              </div>
            </div>
          </div>
        )}
      </div>
      {showAnalysis && <AnalysisModal topic={config.topic} subject={config.subject} unit={config.unit} timer={timer} presenterName={config.name} onClose={() => setShowAnalysis(false)} />}
      {showEnd && (
        <div className="overlay" onClick={() => setShowEnd(false)}>
          <div className="modal" style={{ maxWidth: 340, background: "#0c1422", border: "1px solid rgba(255,255,255,.1)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ background: "linear-gradient(135deg,#060e1c,#08180e)", padding: "22px 18px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 9 }}>🏁</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 4 }}>End class session?</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.38)", lineHeight: 1.7 }}>Duration: <strong style={{ color: "#5ee3b7" }}>{timer}</strong><br />{studentCount} student(s) present</div>
            </div>
            <div style={{ padding: "11px 13px", margin: "10px 18px", borderRadius: 10, background: "rgba(0,195,122,.06)", border: "1px solid rgba(0,195,122,.16)", fontSize: 11.5, fontWeight: 600, color: "var(--em)", textAlign: "center" }}>🤖 AI will generate your full performance report after ending.</div>
            <div className="mf" style={{ borderColor: "rgba(255,255,255,.08)" }}>
              <button className="btn-s" style={{ background: "rgba(255,255,255,.04)", borderColor: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.5)" }} onClick={() => setShowEnd(false)}>Keep Going</button>
              <button className="btn-d" onClick={handleEnd} disabled={ending}>{ending ? "Ending…" : "End & Generate Report"}</button>
            </div>
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}

/* ============================================================================================
   CO-TEACHER / STUDENT JOIN ROOM — Observer
   ============================================================================================ */
function StudentJoinRoom({ config, onEnd }) {
  const timer = useTimer(true);
  const [panelTab, setPanelTab] = useState("chat");
  const [messages, setMessages] = useState([{ sender: "AI Co-Teacher", text: `Welcome, ${config.name}! You've joined "${config.topic || "the class"}". Watch, chat, or raise your hand to speak.`, type: "ai", time: Date.now() }]);
  const [chatInput, setChatInput] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [presenterSpeaking, setPresenterSpeaking] = useState(false);
  const [reaction, setReaction] = useState(null);
  const [showReactions, setShowReactions] = useState(false);
  const chatEndRef = useRef(null);
  const { show: toast$, node: toastNode } = useToast();
  const presenterName = config.liveSession?.hostCandidateName || "Teacher";
  const presenterColor = avColor(presenterName);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    const id = setInterval(() => {
      setPresenterSpeaking((v) => !v);
      if (Math.random() > 0.78) {
        const sims = [{ sender: "AI Co-Teacher", text: "The teacher is making a strong point here — feel free to ask questions.", type: "ai" }, { sender: presenterName, text: "Does anyone have questions about this?", type: "presenter" }];
        const m = sims[Math.floor(Math.random() * sims.length)];
        setMessages((ms) => [...ms, { ...m, time: Date.now() }]);
      }
    }, 5000 + Math.random() * 6000);
    return () => clearInterval(id);
  }, [presenterName]);

  function addMsg(sender, text, type) { setMessages((ms) => [...ms, { sender, text, type, time: Date.now() }]); }
  function sendMsg() {
    if (!chatInput.trim()) return;
    addMsg(config.name, chatInput.trim());
    sendSeminarMessage({ sessionId: config.sessionId, candidateName: config.name, message: chatInput.trim(), role: "observer" }); // 🔌 mock -> POST /seminar/chat/send
    setChatInput("");
  }
  function toggleMic() {
    if (!micOn) { navigator.mediaDevices.getUserMedia({ audio: true }).then(() => { setMicOn(true); toast$("🎤 Mic active", "success"); }).catch(() => toast$("Mic permission denied", "error")); }
    else { setMicOn(false); toast$("🔇 Mic muted", "warn"); }
  }
  async function toggleHand() {
    const n = !handRaised; setHandRaised(n);
    if (n) {
      await requestSeminarSpeakingAccess({ sessionId: config.sessionId, candidateId: config.candidateId, candidateName: config.name }); // 🔌 mock -> POST /seminar/speak/request
      addMsg("AI Co-Teacher", `${config.name} has raised their hand. Teacher, please acknowledge.`, "ai");
      toast$("✋ Hand raised", "warn");
    } else toast$("Hand lowered", "info");
  }
  function sendReaction(emoji) { setShowReactions(false); const k = Date.now(); setReaction({ emoji, k }); setTimeout(() => setReaction(null), 2400); }
  const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="room-page">
      <div className="room-bar">
        <div className="room-logo"><div className="room-logo-ic">🎓</div>SeminarArena</div>
        <div className="room-divider" />
        <div className="room-topic"><strong>{config.role === "Co-Teacher" ? "Co-Teaching: " : "Observing: "}</strong>{config.topic || "Class Session"}</div>
        <div className="r-pill rp-timer">{timer}</div>
        <div className="r-pill rp-ai">{config.role === "Co-Teacher" ? "🔗 Co-Teacher" : "🧑‍🎓 Student"}</div>
        <button className="rbar-end-btn" onClick={() => setShowEnd(true)}>Leave</button>
      </div>
      <div className="room-body">
        <div className="grid-area">
          <div className="ss-area">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "rgba(255,255,255,.2)", flex: 1, width: "100%" }}>
              <div style={{ fontSize: 52, opacity: .18 }}>🖥️</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.4)" }}>Teacher's Screen</div>
              <div style={{ fontSize: 11, textAlign: "center", maxWidth: 220, lineHeight: 1.6, color: "rgba(255,255,255,.25)" }}>The teacher's screen appears here once they start sharing.</div>
              {presenterSpeaking && (<div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 8, background: "rgba(0,195,122,.09)", border: "1px solid rgba(0,195,122,.2)", marginTop: 8 }}><SoundAnalyser active color="#5ee3b7" bars={6} size={20} /><span style={{ fontSize: 11, fontWeight: 700, color: "#5ee3b7" }}>Teacher speaking…</span></div>)}
            </div>
            {reaction && <div key={reaction.k} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 44, animation: "rPop 2s forwards", pointerEvents: "none", zIndex: 5 }}>{reaction.emoji}</div>}
          </div>
          <div className="presenter-strip">
            <div className="strip-tile" style={{ border: `1.5px solid ${presenterColor}44` }}>
              <div className="strip-av" style={{ background: presenterColor + "22", color: presenterColor }}>{avInit(presenterName)}</div>
              {presenterSpeaking && <div style={{ position: "absolute", top: 5, right: 5 }}><SoundAnalyser active color="#5ee3b7" bars={4} size={16} /></div>}
              <div className="strip-ov"><span className="strip-name">{presenterName}</span></div>
            </div>
            <div className="strip-tile" style={{ border: "1.5px solid rgba(45,156,219,.3)" }}><div style={{ fontSize: 22 }}>🤖</div><div className="strip-ov"><span className="strip-name">AI Co-Teacher</span></div></div>
          </div>
          <div className="ctrl-bar">
            <div className="cg">
              <button className={`cbtn ${micOn ? "on" : "off"}`} onClick={toggleMic}><span className="cbtn-ic">{micOn ? "🎤" : "🔇"}</span><span>{micOn ? "Mute" : "Speak"}</span></button>
              <button className={`cbtn${handRaised ? " em" : ""}`} onClick={toggleHand}><span className="cbtn-ic">✋</span><span>{handRaised ? "Lower" : "Raise"}</span></button>
              <div style={{ position: "relative" }}>
                <button className={`cbtn${showReactions ? " hi" : ""}`} onClick={() => setShowReactions((r) => !r)}><span className="cbtn-ic">😊</span><span>React</span></button>
                {showReactions && <div className="react-pop">{REACTIONS.map((r) => <button key={r} className="react-em" onClick={() => sendReaction(r)}>{r}</button>)}</div>}
              </div>
            </div>
            <div className="cg">
              <button className={`cbtn${panelTab === "chat" ? " hi" : ""}`} onClick={() => setPanelTab("chat")}><span className="cbtn-ic">💬</span><span>Chat</span></button>
              <button className={`cbtn${panelTab === "people" ? " hi" : ""}`} onClick={() => setPanelTab("people")}><span className="cbtn-ic">👥</span><span>People</span></button>
              <button className="end-room-btn-sm" style={{ background: "rgba(229,62,62,.8)" }} onClick={() => setShowEnd(true)}>Leave</button>
            </div>
          </div>
        </div>
        <div className="side-panel" style={{ width: 280, minWidth: 280 }}>
          <div className="panel-tabs">{[{ id: "chat", ic: "💬", lbl: "Chat" }, { id: "people", ic: "👥", lbl: "People" }].map((t) => <button key={t.id} className={`ptab${panelTab === t.id ? " active" : ""}`} onClick={() => setPanelTab(t.id)}><span style={{ fontSize: 12 }}>{t.ic}</span><span>{t.lbl}</span></button>)}</div>
          {panelTab === "chat" && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
              <div className="pscroll" style={{ flex: 1 }}>
                <div className="chat-msgs">
                  {messages.map((m, i) => { const own = m.sender === config.name; const isAI = m.type === "ai"; return (
                    <div key={i} className={`chat-msg${own ? " own" : ""}`}>
                      {!own && <div className="chat-av-s" style={{ background: isAI ? "rgba(45,156,219,.2)" : "rgba(255,255,255,.08)", color: isAI ? "#7ed3f7" : "rgba(255,255,255,.5)" }}>{isAI ? "🤖" : m.sender[0]?.toUpperCase()}</div>}
                      <div className="chat-bw">
                        {!own && <span className="chat-sender">{m.sender}</span>}
                        <div className={`chat-bubble ${own ? "b-own" : ""}`} style={isAI ? { background: "rgba(45,156,219,.09)", border: "1px solid rgba(45,156,219,.15)", color: "#d0e8ff", borderRadius: "3px 9px 9px 9px" } : !own ? { background: "rgba(255,255,255,.07)", color: "#e8ecf2", border: "1px solid rgba(255,255,255,.07)", borderRadius: "3px 9px 9px 9px" } : {}}>{m.text}</div>
                        <span className="chat-t">{fmt(m.time)}</span>
                      </div>
                    </div>
                  ); })}
                  <div ref={chatEndRef} />
                </div>
              </div>
              <div className="chat-ia">
                <textarea className="chat-inp" placeholder="Ask a question…" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }} rows={1} />
                <button className="chat-send" onClick={sendMsg}>➤</button>
              </div>
            </div>
          )}
          {panelTab === "people" && (
            <div className="pscroll">
              <div style={{ padding: "7px 10px 2px", fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "rgba(255,255,255,.2)" }}>In this class</div>
              <div className="p-list">
                {[{ name: presenterName, role: "🎙️ Teacher", color: presenterColor, speaking: presenterSpeaking }, { name: "AI Co-Teacher", role: "🤖 AI Co-Teacher", color: "#2d9cdb", speaking: false }, { name: config.name, role: config.role === "Co-Teacher" ? "🔗 Co-Teacher (You)" : "🧑‍🎓 Student (You)", color: avColor(config.name), speaking: micOn }].map((p, i) => (
                  <div key={i} className="p-row">
                    <div className="p-av" style={{ background: p.color + "20", color: p.color }}>{p.name === "AI Co-Teacher" ? "🤖" : avInit(p.name)}</div>
                    <div className="p-info"><div className="p-name">{p.name}</div><div className="p-role">{p.role}{p.speaking ? " 🔊" : ""}</div></div>
                    {p.speaking && <SoundAnalyser active color={p.color} bars={4} size={16} />}
                    {handRaised && p.name === config.name && <span style={{ fontSize: 11 }}>✋</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {showEnd && (
        <div className="overlay" onClick={() => setShowEnd(false)}>
          <div className="modal" style={{ maxWidth: 320, background: "#0c1422", border: "1px solid rgba(255,255,255,.1)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "22px 18px", textAlign: "center" }}><div style={{ fontSize: 38, marginBottom: 8 }}>👋</div><div style={{ fontSize: 13.5, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Leave this class?</div><div style={{ fontSize: 11.5, color: "rgba(255,255,255,.38)" }}>You've been here for {timer}</div></div>
            <div className="mf" style={{ borderColor: "rgba(255,255,255,.08)" }}>
              <button className="btn-s" style={{ background: "rgba(255,255,255,.04)", borderColor: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.5)" }} onClick={() => setShowEnd(false)}>Stay</button>
              <button className="btn-d" onClick={() => onEnd({ timer, topic: config.topic, subject: config.subject, unit: config.unit, presenterName, modeType: "observer", canViewFeedback: false })}>Leave Session</button>
            </div>
          </div>
        </div>
      )}
      {toastNode}
    </div>
  );
}

/* ============================================================================================
   RESULTS
   ============================================================================================ */
function SeminarResults({ result, onBackToHistory }) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showFeedbackChat, setShowFeedbackChat] = useState(false);
  const [feedbackChatMessages, setFeedbackChatMessages] = useState([]);
  const [feedbackChatInput, setFeedbackChatInput] = useState("");
  const [feedbackChatLoading, setFeedbackChatLoading] = useState(false);
  const isObserver = result.modeType === "observer";

  function handleDownload() {
    downloadSessionPDF({ config: { name: result.presenterName, topic: result.topic, subject: result.subject, unit: result.unit }, timer: result.timer, transcriptHistory: result.transcriptHistory || [], notes: result.notes || [], messages: result.messages || [], apiScores: result.scores || null });
  }

  async function openFeedbackChat() {
    setShowFeedbackChat(true);
    if (feedbackChatMessages.length) return;
    setFeedbackChatLoading(true);
    try {
      const res = await startSeminarChat({ sessionId: result.sessionId }); // 🔌 mock -> POST /seminar/chat/start
      setFeedbackChatMessages([{ id: "start", role: "assistant", text: res.ai_response }]);
    } catch { setFeedbackChatMessages([{ id: "err", role: "assistant", text: "Unable to start the feedback chat right now." }]); }
    finally { setFeedbackChatLoading(false); }
  }
  async function sendFeedbackChat() {
    const trimmed = feedbackChatInput.trim();
    if (!trimmed || feedbackChatLoading) return;
    setFeedbackChatMessages((c) => [...c, { id: `u-${Date.now()}`, role: "user", text: trimmed }]);
    setFeedbackChatInput("");
    setFeedbackChatLoading(true);
    try {
      const res = await respondSeminarChat({ sessionId: result.sessionId, message: trimmed }); // 🔌 mock -> POST /seminar/chat/respond
      setFeedbackChatMessages((c) => [...c, { id: `a-${Date.now()}`, role: "assistant", text: res.ai_response }]);
    } catch { setFeedbackChatMessages((c) => [...c, { id: `e-${Date.now()}`, role: "assistant", text: "Unable to continue the feedback chat." }]); }
    finally { setFeedbackChatLoading(false); }
  }

  return (
    <div className="results-page route-enter">
      <div className="res-trophy">{isObserver ? "👁️" : "🎓"}</div>
      <h2 className="res-h">{isObserver ? "Session Ended" : "Class Complete!"}</h2>
      <p className="res-sub">{isObserver ? <>You sat in on <strong style={{ color: "var(--em)" }}>{result.topic?.slice(0, 30) || "the class"}</strong> for <strong style={{ color: "var(--em)" }}>{result.timer}</strong>.</> : <>Class on <strong style={{ color: "var(--em)" }}>{result.topic?.slice(0, 30)}</strong> lasted <strong style={{ color: "var(--em)" }}>{result.timer}</strong>.</>}</p>
      {result.subject && (<div style={{ display: "flex", gap: 7, marginBottom: 13, flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ padding: "3px 11px", borderRadius: 20, background: "rgba(0,195,122,.08)", border: "1px solid rgba(0,195,122,.18)", fontSize: 11, fontWeight: 700, color: "var(--em)" }}>📚 {result.subject}</span>
        {result.unit && <span style={{ padding: "3px 11px", borderRadius: 20, background: "rgba(45,156,219,.08)", border: "1px solid rgba(45,156,219,.18)", fontSize: 11, fontWeight: 700, color: "var(--sky)" }}>📖 {result.unit}</span>}
      </div>)}
      <div className="res-stats">
        {[{ l: "Duration", v: result.timer, i: "⏱️" }, { l: isObserver ? "Role" : "Score", v: isObserver ? (result.modeType === "observer" ? "Student" : "—") : (result.scores?.total_score ?? "—"), i: isObserver ? "🧑‍🎓" : "🏅" }, { l: "Mode", v: result.modeType === "prepare" ? "AI Prep" : "Live Class", i: "🎓" }].map((s, i) => (
          <div key={s.l} className="res-stat" style={{ animationDelay: `${i * .1}s` }}><div className="res-stat-ic">{s.i}</div><div className="res-stat-v">{s.v}</div><div className="res-stat-l">{s.l}</div></div>
        ))}
      </div>
      <div className="res-acts">
        {!isObserver && <button className="btn-s" style={{ borderColor: "rgba(0,195,122,.28)", color: "var(--em)" }} onClick={() => setShowAnalysis(true)}>📊 View Report</button>}
        {!isObserver && <button className="btn-s" style={{ borderColor: "rgba(124,58,237,.28)", color: "var(--vio)" }} onClick={openFeedbackChat}>💬 Ask AI About Feedback</button>}
        {!isObserver && <button className="btn-s" style={{ borderColor: "rgba(45,156,219,.28)", color: "var(--sky)" }} onClick={handleDownload}>📥 Download Report</button>}
        <button className="btn-p" style={{ fontSize: 13, width: "auto", padding: "10px 22px" }} onClick={onBackToHistory}>🗂️ Back to History</button>
      </div>
      {showFeedbackChat && (
        <div className="overlay" onClick={() => setShowFeedbackChat(false)}>
          <div className="modal" style={{ maxWidth: 640, height: "min(78vh,680px)" }} onClick={(e) => e.stopPropagation()}>
            <div className="mh"><div className="mh-title">AI Feedback Chat</div><button className="mh-close" onClick={() => setShowFeedbackChat(false)}>✕</button></div>
            <div className="mb" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {feedbackChatMessages.map((m) => (
                <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "82%", padding: "12px 14px", borderRadius: 16, background: m.role === "user" ? "linear-gradient(135deg,#00c37a,#2d9cdb)" : "var(--surf2)", color: m.role === "user" ? "#fff" : "var(--t1)", border: m.role === "user" ? "none" : "1px solid var(--bdr)" }}>
                    {m.role === "assistant" ? <FormattedAIContent content={m.text} /> : m.text}
                  </div>
                </div>
              ))}
              {feedbackChatLoading && <div style={{ fontSize: 12, color: "var(--t2)" }}>AI is thinking…</div>}
            </div>
            <div className="mf" style={{ justifyContent: "stretch" }}>
              <textarea className="finput" style={{ minHeight: 54, flex: 1 }} placeholder="Ask about your feedback, strengths, or next steps…" value={feedbackChatInput} onChange={(e) => setFeedbackChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendFeedbackChat(); } }} />
              <button className="btn-p" style={{ width: "auto" }} onClick={sendFeedbackChat} disabled={feedbackChatLoading || !feedbackChatInput.trim()}>{feedbackChatLoading ? "Sending..." : "Send"}</button>
            </div>
          </div>
        </div>
      )}
      {showAnalysis && <AnalysisModal topic={result.topic} subject={result.subject} unit={result.unit} timer={result.timer} presenterName={result.presenterName} apiScores={result.scores} onClose={() => setShowAnalysis(false)} onDownload={handleDownload} />}
    </div>
  );
}

function AutoAdvance({ delay: d, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, d); return () => clearTimeout(t); }, []); // eslint-disable-line
  return null;
}

/* ============================================================================================
   MAIN — Teacher Seminar Page
   Flow:  History (entry) → Setup ("+ New Seminar") → Loading → Room → Results → History
   ============================================================================================ */
export default function TeacherSeminarPage() {
  const { user } = useAuth();
  const [screen, setScreen] = useState("history"); // history | setup | loading | room | results-loading | results
  const [config, setConfig] = useState(null);
  const [result, setResult] = useState(null);
  const [pageInitialLoad, setPageInitialLoad] = useState(true);

  const teacherName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

  useEffect(() => { const t = setTimeout(() => setPageInitialLoad(false), 1200); return () => clearTimeout(t); }, []);

  const loaderSteps = {
    prepare: [{ ic: "🎙️", label: "Enabling voice transcription" }, { ic: "🤖", label: "Loading AI co-teacher" }, { ic: "📋", label: "Preparing notes board" }, { ic: "✅", label: "Room ready" }],
    host: [{ ic: "🖥️", label: "Setting up screen share" }, { ic: "🤖", label: "Initialising AI co-teacher" }, { ic: "🎙️", label: "Enabling live transcript" }, { ic: "✅", label: "Class room ready" }],
    coteach: [{ ic: "🔗", label: "Connecting to class" }, { ic: "💬", label: "Loading chat" }, { ic: "✅", label: "Joined class" }],
  };
  function getLoaderSteps() {
    if (!config) return loaderSteps.prepare;
    if (config.seminarMode === "prepare") return loaderSteps.prepare;
    if (config.sessionSubMode === "coteach") return loaderSteps.coteach;
    return loaderSteps.host;
  }

  function handleLaunch(cfg) { setConfig(cfg); setScreen("loading"); }
  function handleEnd(res) { setConfig(null); setResult(res); setScreen("results-loading"); }
  function handleBackToHistory() { setResult(null); setConfig(null); setScreen("history"); }
  function handleNewSeminar() { setScreen("setup"); }

  if (pageInitialLoad) {
    return (
      <>
        <style>{CSS}</style>
        <div className="sp-app"><PageLoader label="Loading SeminarArena" sublabel="Preparing your teacher workspace..." /></div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="sp-app">
        {screen === "history" && (
          <TeacherSeminarHistory
            teacherName={teacherName}
            onNewSeminar={handleNewSeminar}
            onOpenResult={(item) => setResult({ modeType: "prepare", timer: item.duration, topic: item.topic, subject: item.subject, unit: item.unit, presenterName: teacherName, scores: { total_score: item.score }, canViewFeedback: true }) || setScreen("results")}
          />
        )}

        {screen === "setup" && (
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <TeacherSeminarSetup teacherName={teacherName} onBack={() => setScreen("history")} onLaunch={handleLaunch} />
          </div>
        )}

        {screen === "loading" && config && (
          <>
            <PageLoader
              label={config.seminarMode === "prepare" ? "Entering AI Prep Room…" : config.sessionSubMode === "coteach" ? "Joining Class…" : "Launching Class Room…"}
              sublabel={config.seminarMode === "prepare" ? "Setting up voice transcription & AI co-teacher" : config.sessionSubMode === "coteach" ? "Connecting to live session" : "Preparing screen share & AI co-teacher"}
              steps={getLoaderSteps()}
            />
            <AutoAdvance delay={1600} onDone={() => setScreen("room")} />
          </>
        )}

        {screen === "room" && config && config.seminarMode === "prepare" && <PrepareWithAIRoom config={config} onEnd={handleEnd} />}
        {screen === "room" && config && config.seminarMode === "session" && config.sessionSubMode === "host" && <TeacherLiveRoom config={config} onEnd={handleEnd} />}
        {screen === "room" && config && config.seminarMode === "session" && config.sessionSubMode === "coteach" && <StudentJoinRoom config={config} onEnd={handleEnd} />}

        {screen === "results-loading" && result && <ResultsLoader onDone={() => setScreen("results")} isObserver={result.modeType === "observer"} />}
        {screen === "results" && result && <SeminarResults result={result} onBackToHistory={handleBackToHistory} />}
      </div>
    </>
  );
}