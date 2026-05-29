// ─── Constants ──────────────────────────────────────────────────────────────
export const COLORS = ["#6366f1","#10b981","#f59e0b","#38bdf8","#ec4899","#8b5cf6","#f97316","#06b6d4"];

export const TOPICS = [
  "Should AI replace human teachers?",
  "Is social media harmful to democracy?",
  "Should coding be mandatory in schools?",
  "Is nuclear energy the answer to climate change?",
  "Should universal basic income be implemented?",
  "Is space exploration worth the cost?",
  "Should animal testing be banned?",
  "Were the Crusades justified?",
];

export const PHASES = ["Opening Statements","Cross-Examination","Rebuttal Round","Closing Arguments"];
export const REACTIONS = ["👍","👏","❤️","😂","🔥","🤔"];

export const AI_DEBATE_LINES = [
  "That's a compelling point, but the empirical evidence tells a fundamentally different story.",
  "I'd challenge that claim — you're conflating correlation with causation here.",
  "Strong argument, but you're overlooking the long-term systemic implications entirely.",
  "Can you substantiate that with concrete data? Anecdotes aren't sufficient in formal debate.",
  "That reasoning relies on a false premise. Let me explain precisely why it breaks down.",
  "I concede that specific point — yet your core conclusion remains unsubstantiated.",
  "History provides compelling counter-examples to exactly this kind of assertion.",
  "You raise an interesting point, but it's fundamentally a strawman fallacy.",
  "Let me reframe: the real question is about the underlying structural problem you're ignoring.",
  "Your argument assumes a static system — but dynamic feedback loops change everything.",
  "Even granting your premise, the conclusion doesn't follow logically from the evidence.",
  "That perspective, while popular, has been thoroughly debunked in recent academic literature.",
];

export const AI_SEMINAR_LINES = [
  "Excellent contribution. Let's explore the counterargument to deepen our understanding.",
  "Building on that point — has anyone considered the ethical implications?",
  "Fascinating perspective. Can someone offer a different angle on this?",
  "That touches on a key tension in this topic. Let's unpack it together.",
  "Would anyone like to challenge or extend this argument?",
  "I notice we haven't addressed the economic dimension yet — thoughts?",
  "Let's hear from someone who might see this differently.",
  "That's the crux of the debate. What does the evidence actually tell us?",
];

export const AI_MEDIATOR_INTROS = [
  "Welcome everyone. I'll be facilitating today's session on",
  "Good to have you all here. Today we'll be exploring",
  "Thank you for joining. Our seminar topic today is",
];

// ─── Room ID & Link Generation ───────────────────────────────────────────────
export function generateRoomId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 10; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function generateRoomLink(roomId: string, mode: string): string {
  return `${window.location.origin}/debate/join?room=${roomId}&mode=${mode}`;
}

export function parseRoomLink(url: string): { roomId: string; mode: string } | null {
  try {
    const u = new URL(url);
    const room = u.searchParams.get("room");
    const mode = u.searchParams.get("mode");
    if (!room) return null;
    return { roomId: room, mode: mode || "debate" };
  } catch { return null; }
}

// ─── Invite / User management ────────────────────────────────────────────────
export interface Invitee {
  id: string;
  value: string; // email or name
  type: "email" | "name";
  status: "pending" | "sent" | "joined" | "declined";
  avatarColor: string;
  joinedAt?: number;
}

export function createInvitee(value: string): Invitee {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    value: value.trim(),
    type: isEmail ? "email" : "name",
    status: "pending",
    avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}

// Simulate sending invite email
export function sendInviteEmail(email: string, roomLink: string, topic: string, hostName: string): boolean {
  console.log(`[INVITE] Sending to ${email}: "${topic}" - ${roomLink} from ${hostName}`);
  // In production: POST /api/invite with { email, roomLink, topic, hostName }
  return true;
}

// ─── Session persistence ─────────────────────────────────────────────────────
const SESSION_KEY = "da_session_v3";

export function saveSession(screen: string, extra?: any) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      screen, extra: extra || null, ts: Date.now(),
    }));
  } catch {}
}

export function loadSession() {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    if (!s) return null;
    const d = JSON.parse(s);
    if (Date.now() - d.ts > 6 * 3600 * 1000) return null; // 6h expiry
    return d;
  } catch { return null; }
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

// ─── Room registry (simulate backend) ────────────────────────────────────────
const ROOMS_KEY = "da_rooms_v3";

export interface RoomRecord {
  roomId: string;
  mode: string;
  topic: string;
  hostName: string;
  link: string;
  createdAt: number;
  invitees: Invitee[];
}

export function registerRoom(room: RoomRecord) {
  try {
    const rooms = JSON.parse(localStorage.getItem(ROOMS_KEY) || "{}");
    rooms[room.roomId] = room;
    localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
  } catch {}
}

export function lookupRoom(roomId: string): RoomRecord | null {
  try {
    const rooms = JSON.parse(localStorage.getItem(ROOMS_KEY) || "{}");
    return rooms[roomId] || null;
  } catch { return null; }
}

// ─── Notifications ────────────────────────────────────────────────────────────
const NOTIF_KEY = "debateArena_notifications";
const CAL_KEY   = "gradeup_cal_events_v3";

export function pushNotif(title: string, body: string, type = "system") {
  try {
    const ex = JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]");
    localStorage.setItem(NOTIF_KEY, JSON.stringify([
      { id: Date.now().toString(), title, message: body, category: type, time: "Just now", read: false },
      ...ex,
    ].slice(0, 50)));
    window.dispatchEvent(new StorageEvent("storage", { key: NOTIF_KEY }));
  } catch {}
}

export function syncCal(payload: any) {
  try {
    const existingEvents = JSON.parse(localStorage.getItem(CAL_KEY) || "[]");

    const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const startTime = payload.time || "10:00";
    const startDate = new Date(payload.date);
    const [h, m] = startTime.split(':').map(Number);
    startDate.setHours(h, m, 0, 0);

    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

    const newEvent = {
      id: `da-${Date.now()}`,
      title: payload.title,
      type: payload.type,
      date: toDateStr(startDate),
      startTime: startTime,
      endTime: endTime,
      color: "#0ea5e9",
      location: payload.link ? "Online" : "",
      description: `DebateArena ${payload.type}: ${payload.title}. Link: ${payload.link}`,
      attendees: payload.attendees.map((inv: Invitee) => inv.value).join(', '),
      important: false,
      markExam: false,
      notifyEmail: false,
      emailId: "",
      fromDebateArena: true
    };

    localStorage.setItem(CAL_KEY, JSON.stringify([...existingEvents, newEvent]));

    window.dispatchEvent(new StorageEvent("storage", { key: CAL_KEY }));
    return true;
  } catch (e) {
    console.error("Failed to sync to calendar:", e);
    return false;
  }
}

// ─── Participant model ────────────────────────────────────────────────────────
export interface Participant {
  id: number;
  name: string;
  stream: MediaStream | null;
  isLocal?: boolean;
  isHost?: boolean;
  isAI?: boolean;
  isMed?: boolean;
  micMuted: boolean;
  camOn: boolean;
  isSpeaking: boolean;
  handRaised: boolean;
  isMyTurn?: boolean;
  isAITyping?: boolean;
  avatarColor?: string;
  inviteeId?: string; // link back to Invitee
  joinedAt?: number;
}

export function makeParticipant(overrides: Partial<Participant> & { id: number; name: string }): Participant {
  return {
    stream: null, micMuted: false, camOn: false,
    isSpeaking: false, handRaised: false,
    avatarColor: COLORS[overrides.id % COLORS.length],
    joinedAt: Date.now(),
    ...overrides,
  };
}