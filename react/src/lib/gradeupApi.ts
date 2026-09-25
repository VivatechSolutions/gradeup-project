import { buildApiUrl } from "./apiBase";

export type LibraryUnit = {
  id: string;
  subjectGroupKey: string;
  documentId: string;
  board: string;
  standard: string;
  subject: string;
  part?: string | null;
  term?: string | null;
  unitNumber?: number | null;
  unitTitle: string;
  unitLabel: string;
  chapterName?: string | null;
  readerIndex?: {
    sections?: string[];
    avatarSections?: Array<{
      sectionId?: string | null;
      sectionTitle: string;
      order?: number | null;
      hasAvatarLesson: boolean;
    }>;
    hasGlossary?: boolean;
    hasSummary?: boolean;
  };
  debateTopics?: any;
  sectionTopics?: Array<{
    id: string;
    sectionId?: string | null;
    sectionNumber?: string | null;
    sectionTitle: string;
    sectionType?: string | null;
    label: string;
  }>;
  hasStructuredData: boolean;
  hasEnrichedData: boolean;
};

export type LibrarySubject = {
  id: string;
  subjectGroupKey: string;
  title: string;
  subject: string;
  board: string;
  standard: string;
  part?: string | null;
  term?: string | null;
  unitCount: number;
  progressPercent?: number;
  completedActivities?: number;
  averageScore?: number | null;
  visual?: {
    iconKey?: string;
    colorKey?: string;
  };
  coverImageUrl?: string | null;
  imageCandidates?: string[];
  unitNumbers: number[];
  units: LibraryUnit[];
  updatedAt: string;
};

type UnitLabelSource = Pick<
  LibraryUnit,
  "unitNumber" | "unitTitle" | "unitLabel" | "chapterName"
>;

const normalizeUnitLabelPart = (value?: string | null) =>
  String(value || "").trim().replace(/\s+/g, " ");

export function getLibraryUnitDisplayLabel(unit: UnitLabelSource) {
  const unitLabel = normalizeUnitLabelPart(unit.unitLabel);
  const unitTitle = normalizeUnitLabelPart(unit.unitTitle);
  const chapterName = normalizeUnitLabelPart(unit.chapterName);
  const numberLabel =
    unit.unitNumber !== null && unit.unitNumber !== undefined
      ? `Unit ${String(unit.unitNumber).padStart(2, "0")}`
      : "";
  const isUnitNumberLabel = (value: string) => /^unit\s*0*\d+$/i.test(value);
  const prefix =
    [unitLabel, unitTitle].find((value) => isUnitNumberLabel(value)) ||
    numberLabel;
  const chapter =
    chapterName ||
    [unitTitle, unitLabel].find(
      (value) => value && !isUnitNumberLabel(value) && value.toLowerCase() !== prefix.toLowerCase(),
    ) ||
    "";

  if (prefix && chapter && prefix.toLowerCase() !== chapter.toLowerCase()) {
    return `${prefix} — ${chapter}`;
  }
  return prefix || chapter || unitTitle || "Unit";
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const isFormDataBody =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(buildApiUrl(url), {
    ...init,
    headers: {
      ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
      "x-timezone": browserTimezone(),
      ...(init?.headers || {}),
    },
    credentials: "include",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.status === false) {
    throw new Error(
      payload?.message || `Request failed with ${response.status}`,
    );
  }

  return payload?.data as T;
}

async function apiFetchRaw(url: string, init?: RequestInit) {
  const response = await fetch(buildApiUrl(url), {
    ...init,
    credentials: "include",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.status === false) {
    throw new Error(
      payload?.message || `Request failed with ${response.status}`,
    );
  }

  return payload?.data;
}

export function getCandidateContext(user: any) {
  return {
    candidateId: String(user?.id || user?._id || ""),
    candidateName:
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
      user?.username ||
      user?.email ||
      "GradeUp Learner",
  };
}

export type ExamSetup = {
  unitId?: string;
  subjectGroupKey?: string;
  subject: string;
  board: string;
  classNumber: string;
  unitNumber: number;
  unitName: string;
};

export type ExamQuestion = {
  question_id: string;
  question: string;
  type: string;
  marks: number;
  difficulty?: string;
  bloom_level?: string;
  unit_number?: number;
  section_title?: string;
  topic?: string;
  options?: string[];
  source?: string;
  year?: string;
  exam_name?: string;
  student_answer?: string | null;
  score?: number;
  max_score?: number;
  score_percentage?: number;
  is_correct?: boolean;
  correct_answer?: string;
  explanation?: string;
  feedback?: string;
  textbook_reference?: string;
};

export type ExamPreparation = {
  success: boolean;
  prep_id: string;
  subject: string;
  subject_family?: string;
  unit_number: number;
  unit_title: string;
  board: string;
  class_number: string;
  generated_once?: boolean;
  priority_topics: Array<{
    topic: string;
    source?: string;
    frequency?: number;
    hard_count?: number;
    avg_bloom?: number;
    years?: string[];
    why_important?: string;
    key_takeaways?: string[];
    priority?: number;
  }>;
  subject_specifics?: Record<string, string[]>;
  important_questions_preview?: Array<{
    question: string;
    marks?: number;
    frequency?: number;
    difficulty?: string;
    topic?: string;
    year?: string;
    exam_name?: string;
    type?: string;
  }>;
  sources?: Record<string, any>;
  personalized?: { candidate_id?: string; weak_sections_used?: string[] };
  from_cache?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ExamAnswer = {
  questionId: string;
  answer: string;
  savedAt?: string;
  syncedAt?: string | null;
};

export type ExamAttempt = {
  id: string;
  examId: string;
  candidateId: string;
  candidateName: string;
  unitId?: string | null;
  subjectGroupKey?: string | null;
  subject: string;
  board?: string | null;
  classNumber?: string | null;
  unitNumber?: number | null;
  unitName?: string | null;
  examType?: string;
  questions: ExamQuestion[];
  answers: ExamAnswer[];
  currentQuestionId?: string | null;
  currentQuestionIndex: number;
  reviewQuestionIds: string[];
  totalQuestions: number;
  totalMarks: number;
  timerSeconds?: number | null;
  remainingSeconds?: number | null;
  startedAt: string;
  expiresAt?: string | null;
  status: "in_progress" | "evaluating" | "completed" | "ended";
  submissionReason?: "manual" | "time_expired" | "security_warnings" | null;
  warningCount: number;
  warnings?: Array<{ reason: string; questionId?: string; message?: string; occurredAt: string }>;
  result?: any;
  submittedAt?: string | null;
  submissionError?: string | null;
  serverNow?: string;
};

export async function prepareExam(setup: ExamSetup) {
  return apiFetch<ExamPreparation>("/api/exam/prepare", {
    method: "POST",
    body: JSON.stringify({
      unitId: setup.unitId,
      subjectGroupKey: setup.subjectGroupKey,
      subject: setup.subject,
      board: setup.board,
      class_number: setup.classNumber,
      unit_number: setup.unitNumber,
      unit_name: setup.unitName,
    }),
  });
}

export async function startExam(setup: ExamSetup) {
  return apiFetch<ExamAttempt>("/api/exam/start", {
    method: "POST",
    body: JSON.stringify({
      unitId: setup.unitId,
      subjectGroupKey: setup.subjectGroupKey,
      subject: setup.subject,
      board: setup.board,
      class_number: setup.classNumber,
      unit_number: setup.unitNumber,
      unit_name: setup.unitName,
    }),
  });
}

export async function getExamAttempts() {
  return apiFetch<ExamAttempt[]>("/api/exam/attempts");
}

export async function getExamAttempt(examId: string) {
  return apiFetch<ExamAttempt>(`/api/exam/attempts/${encodeURIComponent(examId)}`);
}

export async function saveExamAnswer(examId: string, questionId: string, answer: string) {
  return apiFetch<any>(`/api/exam/${encodeURIComponent(examId)}/answer`, {
    method: "POST",
    body: JSON.stringify({ question_id: questionId, answer }),
  });
}

export async function saveExamProgress(
  examId: string,
  payload: { currentQuestionIndex: number; reviewQuestionIds: string[] },
) {
  return apiFetch<ExamAttempt>(`/api/exam/attempts/${encodeURIComponent(examId)}/progress`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function recordExamWarning(
  examId: string,
  payload: { reason: string; questionId?: string; message?: string },
) {
  return apiFetch<ExamAttempt & { examEnded?: boolean }>(
    `/api/exam/attempts/${encodeURIComponent(examId)}/warnings`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function submitExam(examId: string) {
  return apiFetch<ExamAttempt>(`/api/exam/${encodeURIComponent(examId)}/submit`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getLibrarySubjects(search = "") {
  const params = new URLSearchParams();
  if (search) {
    params.set("search", search);
  }

  return apiFetch<LibrarySubject[]>(
    `/api/v1/student/library/subjects${params.toString() ? `?${params.toString()}` : ""}`,
  );
}

export async function getStudentBooks() {
  return apiFetch<any[]>("/api/v1/student/library/books");
}

export async function getStudentDashboard() {
  return apiFetch<any>(`/api/v1/student/dashboard?timezone=${encodeURIComponent(browserTimezone())}`);
}

export async function getStudentProgressSummary() {
  return apiFetch<any>(`/api/v1/student/progress/summary?timezone=${encodeURIComponent(browserTimezone())}`);
}

export async function getStudentAchievements() {
  return apiFetch<any[]>(`/api/v1/student/achievements?timezone=${encodeURIComponent(browserTimezone())}`);
}

function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export async function checkInStudent() {
  return apiFetch<any>("/api/v1/student/activity/check-in", {
    method: "POST",
    body: JSON.stringify({ timezone: browserTimezone() }),
  });
}

export async function startStudySession(payload: {
  activityType: string;
  subjectGroupKey?: string;
  bookId?: string;
  unitId?: string;
  sourceId?: string;
  metadata?: any;
}) {
  return apiFetch<any>("/api/v1/student/activity-sessions", {
    method: "POST",
    body: JSON.stringify({ ...payload, timezone: browserTimezone() }),
  });
}

export async function heartbeatStudySession(sessionId: string, payload: { sequence: number; active: boolean; visible: boolean }) {
  return apiFetch<any>(`/api/v1/student/activity-sessions/${encodeURIComponent(sessionId)}/heartbeat`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function completeStudySession(sessionId: string, metadata?: any) {
  return apiFetch<any>(`/api/v1/student/activity-sessions/${encodeURIComponent(sessionId)}/complete`, {
    method: "POST",
    body: JSON.stringify({ metadata }),
  });
}

export async function getStudentLeaderboard(period: "week" | "month" | "all" = "week") {
  return apiFetch<any>(`/api/v1/student/leaderboard?period=${period}`);
}

export async function getCalendarEvents(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return apiFetch<any[]>(`/api/v1/student/calendar/events${params.size ? `?${params}` : ""}`);
}

export async function createCalendarEvent(payload: any) {
  return apiFetch<any>("/api/v1/student/calendar/events", { method: "POST", body: JSON.stringify(payload) });
}

export async function createScheduledCalendarEvent(payload: { title: string; type: string; date: string; startTime: string; subject?: string; unit?: string; link?: string }) {
  const timeMatch = payload.startTime.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  let hours = Number(timeMatch?.[1] || 0);
  const minutes = Number(timeMatch?.[2] || 0);
  const meridiem = timeMatch?.[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  const normalizedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const startsAt = new Date(`${payload.date}T${normalizedTime}:00`);
  if (Number.isNaN(startsAt.valueOf())) throw new Error("Invalid calendar event time");
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
  return createCalendarEvent({
    title: payload.title,
    type: payload.type,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    timezone: browserTimezone(),
    description: [payload.subject, payload.unit].filter(Boolean).join(" · "),
    location: payload.link || "",
    metadata: { subject: payload.subject, unit: payload.unit, joinUrl: payload.link },
  });
}

export async function updateCalendarEvent(eventId: string, payload: any) {
  return apiFetch<any>(`/api/v1/student/calendar/events/${encodeURIComponent(eventId)}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function deleteCalendarEvent(eventId: string) {
  return apiFetch<void>(`/api/v1/student/calendar/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
}

export async function recordStudentProgress(payload: {
  activityType: string;
  subjectGroupKey?: string;
  bookId?: string;
  unitId?: string;
  status?: string;
  progressPercent?: number;
  metadata?: any;
}) {
  return apiFetch<any>("/api/v1/student/progress/content", {
    method: "POST",
    body: JSON.stringify({ ...payload, timezone: browserTimezone() }),
  });
}
export async function getLibrarySubjectDetail(
  subjectGroupKey: string,
  options: { summary?: boolean } = {},
) {
  const summary = options.summary ? "?summary=true" : "";
  return apiFetch<LibrarySubject>(
    `/api/v1/library/subjects/${encodeURIComponent(subjectGroupKey)}${summary}`,
  );
}

export async function getUnitContent(
  unitId: string,
  format: "structured" | "enriched" | "both" = "enriched",
) {
  return apiFetch<{
    unit: LibraryUnit;
    format: "structured" | "enriched" | "both";
    content: any;
  }>(
    `/api/v1/library/units/${encodeURIComponent(unitId)}/content?format=${format}${format === "both" ? "&summary=true" : ""}`,
  );
}

export async function askTutor(payload: {
  unitId: string;
  candidateId: string;
  candidateName: string;
  query: string;
  conversationId?: string;
  limit?: number;
}) {
  return apiFetch<any>("/api/v1/tutor/ask", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getTutorHistory(payload: {
  candidateId: string;
  conversationId?: string;
  subjectGroupKey?: string;
}) {
  const params = new URLSearchParams({
    candidateId: payload.candidateId,
  });
  if (payload.conversationId) {
    params.set("conversationId", payload.conversationId);
  }
  if (payload.subjectGroupKey) {
    params.set("subjectGroupKey", payload.subjectGroupKey);
  }

  return apiFetch<any[]>(`/api/v1/tutor/history?${params.toString()}`);
}

export async function getTutorConversations(payload: {
  candidateId: string;
  subjectGroupKey?: string;
}) {
  const params = new URLSearchParams({
    candidateId: payload.candidateId,
  });
  if (payload.subjectGroupKey) {
    params.set("subjectGroupKey", payload.subjectGroupKey);
  }

  return apiFetch<any[]>(`/api/v1/tutor/conversations?${params.toString()}`);
}

export async function getTutorConversation(payload: {
  candidateId: string;
  conversationId: string;
}) {
  const params = new URLSearchParams({
    candidateId: payload.candidateId,
  });

  return apiFetch<any>(
    `/api/v1/tutor/conversations/${encodeURIComponent(payload.conversationId)}?${params.toString()}`,
  );
}

export async function clearTutorHistory(payload: {
  candidateId: string;
  conversationId?: string;
}) {
  return apiFetch<any>("/api/v1/tutor/history", {
    method: "DELETE",
    body: JSON.stringify(payload),
  });
}

export async function getFaqs(unitId: string) {
  return apiFetch<any>(
    `/api/v1/library/units/${encodeURIComponent(unitId)}/faq`,
  );
}

export async function generateQuiz(payload: {
  unitId: string;
  candidateId: string;
  candidateName: string;
  difficulty: string;
  numQuestions: number;
}) {
  return apiFetch<any>("/api/v1/tutor/quiz/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitQuiz(payload: {
  quizId: string;
  candidateId: string;
  unitId?: string;
  subjectGroupKey?: string;
  answers: Array<{ question_id: string; answer: string }>;
}) {
  return apiFetch<any>("/api/v1/tutor/quiz/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getQuizHistory(payload: {
  unitId?: string;
  candidateId: string;
}) {
  const params = new URLSearchParams({
    candidateId: payload.candidateId,
  });
  if (payload.unitId) {
    params.set("unitId", payload.unitId);
  }

  return apiFetch<any[]>(`/api/v1/tutor/quiz/history?${params.toString()}`);
}

export async function assignHomework(payload: {
  unitId: string;
  candidateId: string;
  candidateName: string;
  numQuestions: number;
}) {
  return apiFetch<any>("/api/v1/tutor/homework/assign", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitHomework(payload: {
  homeworkId: string;
  candidateId: string;
  unitId?: string;
  subjectGroupKey?: string;
  answers: Array<{ question_id: string; answer: string }>;
}) {
  return apiFetch<any>("/api/v1/tutor/homework/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type HomeworkChatResponse = {
  success: boolean;
  homework_id: string;
  response: string;
  current_question?: string;
  current_question_index?: number;
  total_questions?: number;
  action?: string;
  status?: string;
};

export type HomeworkChatSessionSummary = {
  homework_id: string;
  title: string;
  subject_group_key?: string | null;
  unit_id?: string | null;
  unit_title?: string | null;
  subject?: string | null;
  unit_number?: number | null;
  board?: string | null;
  class_number?: string | null;
  term?: string | null;
  topic_id?: string | null;
  topic_label?: string | null;
  status?: string | null;
  message_count?: number;
  current_question_index?: number;
  total_questions?: number;
  assigned_at?: string | null;
  updated_at?: string | null;
};

export type HomeworkChatSession = HomeworkChatSessionSummary & {
  homework_id: string;
  candidate_id?: string;
  current_question?: string;
  chat_history?: Array<{
    role: "user" | "assistant" | string;
    content: string;
    timestamp?: string;
  }>;
};

export async function sendHomeworkChat(payload: {
  homeworkId: string;
  message?: string;
  imageBase64?: string | null;
  subjectGroupKey?: string | null;
  unitId?: string | null;
  unitTitle?: string | null;
  subject?: string | null;
  unitNumber?: number | null;
  board?: string | null;
  classNumber?: string | null;
  term?: string | null;
  topicId?: string | null;
  topicLabel?: string | null;
}) {
  return apiFetch<HomeworkChatResponse>("/api/v1/tutor/homework/chat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getHomeworkChatHistory() {
  return apiFetch<{
    success: boolean;
    candidate_id: string;
    sessions: HomeworkChatSessionSummary[];
    count: number;
  }>("/api/v1/tutor/homework/chat/history");
}

export async function getHomeworkChatSession(homeworkId: string) {
  return apiFetch<{
    success: boolean;
    candidate_id: string;
    session: HomeworkChatSession;
  }>(`/api/v1/tutor/homework/chat/${encodeURIComponent(homeworkId)}`);
}

export async function getHomework(payload: {
  unitId?: string;
  candidateId: string;
  status?: string;
}) {
  const params = new URLSearchParams({
    candidateId: payload.candidateId,
  });
  if (payload.unitId) {
    params.set("unitId", payload.unitId);
  }
  if (payload.status) {
    params.set("status", payload.status);
  }

  return apiFetch<any[]>(`/api/v1/tutor/homework?${params.toString()}`);
}

export async function getPerformance(payload: {
  unitId?: string;
  candidateId: string;
}) {
  const params = new URLSearchParams({
    candidateId: payload.candidateId,
  });
  if (payload.unitId) {
    params.set("unitId", payload.unitId);
  }

  return apiFetch<any>(`/api/v1/tutor/performance?${params.toString()}`);
}

export async function getPerformancePoints(candidateId: string) {
  return apiFetch<any>(
    `/api/v1/tutor/performance/points?candidateId=${encodeURIComponent(candidateId)}`,
  );
}

export async function startDebate(payload: {
  unitId: string;
  candidateId: string;
  candidateName: string;
  topic: string;
  topicId?: string;
  topicUnitNumber?: number | null;
  topicSectionTitle?: string | null;
  topicPath?: string[];
  debateType?: string;
  visibility?: "public" | "school" | "class" | "private";
}) {
  return apiFetch<any>("/api/v1/debate/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getDebateTopics(
  subjectGroupKey?: string,
  unitNumber?: number | string,
  sectionTitle?: string,
) {
  const params = new URLSearchParams();
  if (subjectGroupKey) {
    params.set("subjectGroupKey", subjectGroupKey);
  }
  if (
    unitNumber !== undefined &&
    unitNumber !== null &&
    String(unitNumber).trim()
  ) {
    params.set("unitNumber", String(unitNumber));
  }
  if (sectionTitle) {
    params.set("sectionTitle", sectionTitle);
  }
  return apiFetch<any>(
    `/api/v1/debate/topics${params.toString() ? `?${params.toString()}` : ""}`,
  );
}

export async function getDebateSession(sessionId: string) {
  return apiFetch<any>(
    `/api/v1/debate/session/${encodeURIComponent(sessionId)}`,
  );
}

export async function joinDebateSession(payload: {
  sessionId: string;
  candidateId: string;
  candidateName: string;
}) {
  return apiFetch<any>("/api/v1/debate/join", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createDebateRoom(payload: {
  unitId: string;
  candidateId: string;
  candidateName: string;
  topic: string;
  topicId?: string;
  topicUnitNumber?: number | null;
  topicSectionTitle?: string | null;
  topicPath?: string[];
  maxParticipants?: number;
  roomLink?: string;
  visibility?: "public" | "school" | "class" | "private";
}) {
  return apiFetch<any>("/api/v1/debate/room/create", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      debateType: "team",
    }),
  });
}

export async function joinDebateRoom(payload: {
  sessionId: string;
  candidateId: string;
  candidateName: string;
}) {
  return apiFetch<any>("/api/v1/debate/room/join", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function startDebateRoom(payload: {
  sessionId: string;
  candidateId: string;
  candidateName: string;
}) {
  return apiFetch<any>("/api/v1/debate/room/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getDebateRoom(sessionId: string) {
  return apiFetch<any>(`/api/v1/debate/room/${encodeURIComponent(sessionId)}`);
}

export async function updateDebateRoomVisibility(sessionId: string, visibility: "public" | "school" | "class" | "private") {
  return apiFetch<any>(`/api/v1/debate/room/${encodeURIComponent(sessionId)}/visibility`, {
    method: "PATCH",
    body: JSON.stringify({ visibility }),
  });
}

export async function submitDebateRoomTurn(payload: {
  sessionId: string;
  candidateId: string;
  candidateName: string;
  team?: "A" | "B";
  message: string;
}) {
  return apiFetch<any>("/api/v1/debate/room/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function completeDebateRoomOpening(payload: {
  sessionId: string;
  candidateId: string;
}) {
  return apiFetch<any>("/api/v1/debate/room/opening-complete", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function completeDebateRoomAiStudent(payload: {
  sessionId: string;
  nextSpeakerId?: string | null;
}) {
  return apiFetch<any>("/api/v1/debate/room/ai-student-complete", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function endDebateRoom(sessionId: string) {
  return apiFetch<any>("/api/v1/debate/room/end", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export async function retryEndDebateRoom(sessionId: string) {
  return apiFetch<any>("/api/v1/debate/room/end/retry", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export async function respondDebate(payload: {
  sessionId: string;
  message: string;
}) {
  return apiFetch<any>("/api/v1/debate/respond", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function endDebate(sessionId: string) {
  return apiFetch<any>("/api/v1/debate/end", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export async function inviteDebate(payload: {
  emails: string[];
  senderName?: string;
  topic: string;
  debateType: string;
  joinUrl: string;
}) {
  return apiFetch<any>("/api/v1/debate/invite", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function transcribeDebateAudio(audioBlob: Blob, language = "en") {
  const formData = new FormData();
  formData.append("audio", audioBlob, "debate-speech.webm");
  formData.append("language", language);

  return apiFetchRaw("/api/v1/debate/speech/transcribe", {
    method: "POST",
    body: formData,
  });
}

export async function synthesizeDebateSpeech(payload: {
  text: string;
  voice?: string;
  format?: string;
}) {
  return apiFetch<any>("/api/v1/debate/speech/speak", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getRealtimeSessionToken() {
  return apiFetch<{
    sessionId?: string;
    clientSecret: string;
    expiresAt?: string | number;
  }>("/api/v1/tutor/speech/realtime-token", {
    method: "POST",
  });
}

export async function startSeminar(payload: {
  unitId: string;
  candidateId: string;
  candidateName: string;
  topic: string;
  subject?: string;
  unitNumber?: number;
  board?: string;
  classNumber?: string;
  unitName?: string;
  mode?: string;
  session_mode?: string;
  sessionId?: string;
  liveSessionId?: string;
  file?: File | null;
}) {
  if (payload.file) {
    const form = new FormData();
    form.append("unitId", payload.unitId);
    form.append("candidateId", payload.candidateId);
    form.append("candidateName", payload.candidateName);
    form.append("topic", payload.topic);
    if (payload.subject) form.append("subject", payload.subject);
    if (payload.unitNumber !== undefined && payload.unitNumber !== null) {
      form.append("unitNumber", String(payload.unitNumber));
    }
    if (payload.board) form.append("board", payload.board);
    if (payload.classNumber) form.append("classNumber", payload.classNumber);
    if (payload.unitName) form.append("unitName", payload.unitName);
    if (payload.mode) form.append("mode", payload.mode);
    if (payload.session_mode) form.append("session_mode", payload.session_mode);
    if (payload.sessionId) form.append("sessionId", payload.sessionId);
    if (payload.liveSessionId)
      form.append("liveSessionId", payload.liveSessionId);
    form.append("file", payload.file);

    return apiFetch<any>("/api/v1/seminar/start", {
      method: "POST",
      body: form,
    });
  }

  return apiFetch<any>("/api/v1/seminar/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createSeminarRoom(payload: {
  unitId: string;
  candidateId: string;
  candidateName: string;
  topic: string;
  roomLink?: string;
  sessionId?: string;
  visibility?: "public" | "school" | "class" | "private";
}) {
  return apiFetch<any>("/api/v1/seminar/create-room", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function startSeminarRoom(payload: {
  sessionId: string;
  unitId: string;
  candidateId: string;
  candidateName: string;
  topic: string;
}) {
  return apiFetch<any>("/api/v1/seminar/room/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getSeminarTopics(subjectGroupKey?: string) {
  const params = new URLSearchParams();
  if (subjectGroupKey) {
    params.set("subjectGroupKey", subjectGroupKey);
  }
  return apiFetch<any[]>(
    `/api/v1/seminar/topics${params.toString() ? `?${params.toString()}` : ""}`,
  );
}

export async function getSeminarSession(sessionId: string) {
  return apiFetch<any>(
    `/api/v1/seminar/session/${encodeURIComponent(sessionId)}`,
  );
}

export async function updateSeminarVisibility(sessionId: string, visibility: "public" | "school" | "class" | "private") {
  return apiFetch<any>(`/api/v1/seminar/session/${encodeURIComponent(sessionId)}/visibility`, {
    method: "PATCH",
    body: JSON.stringify({ visibility }),
  });
}

export async function getActiveSeminarSessions() {
  return apiFetch<any[]>("/api/v1/seminar/active");
}

export async function createSeminarAiDocument(payload: any) {
  return apiFetch<any>("/api/v1/seminar/create-ai/documents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getSeminarAiDocument(documentId: string) {
  return apiFetch<any>(
    `/api/v1/seminar/create-ai/documents/${encodeURIComponent(documentId)}`,
  );
}

export async function saveSeminarAiDocument(documentId: string, updates: any) {
  return apiFetch<any>(
    `/api/v1/seminar/create-ai/documents/${encodeURIComponent(documentId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    },
  );
}

export async function sendSeminarAiDocumentChat(payload: {
  documentId: string;
  prompt: string;
  hasFile?: boolean;
  documentText?: string;
  companionNotesText?: string;
  config?: any;
}) {
  return apiFetch<any>(
    `/api/v1/seminar/create-ai/documents/${encodeURIComponent(payload.documentId)}/chat`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteSeminarAiDocument(documentId: string) {
  return apiFetch<any>(
    `/api/v1/seminar/create-ai/documents/${encodeURIComponent(documentId)}`,
    {
      method: "DELETE",
    },
  );
}

export type SessionShareCardPayload = {
  groupId?: string;
  sessionType: "debate" | "seminar";
  sessionId: string;
  topic: string;
  title?: string;
  createdBy?: string;
  joinUrl: string;
  status?: "waiting" | "active" | "completed" | "ended" | string;
  participantCount?: number;
  source?: string;
  visibility?: "public" | "school" | "class" | "private";
};

export async function shareSessionToCommunity(payload: SessionShareCardPayload & { communityVisibility?: "all" | "school" }) {
  const sessionLabel = payload.sessionType === "seminar" ? "seminar session" : "team debate";
  return apiFetch<any>("/api/community/posts", {
    method: "POST",
    body: JSON.stringify({
      type: "session_card",
      visibility: payload.communityVisibility || (payload.visibility === "school" || payload.visibility === "class" ? "school" : "all"),
      content: `${payload.createdBy || "A GradeUp learner"} created a ${sessionLabel}: ${payload.topic}. Join from the session card.`,
      metadata: {
        sessionCard: {
          ...payload,
          status: payload.status || "waiting",
          title: payload.title || payload.topic,
          source: payload.source || "session_setup",
        },
      },
    }),
  });
}

export async function shareSessionToGroup(payload: SessionShareCardPayload & { groupId: string }) {
  return apiFetch<any>(`/api/v1/group-chat/groups/${encodeURIComponent(payload.groupId)}/session-cards`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listGroupChats() {
  return apiFetch<any[]>("/api/v1/group-chat/groups");
}

export async function sendSessionInviteEmails(payload: SessionShareCardPayload & { emails: string[] }) {
  return apiFetch<any>("/api/v1/group-chat/session-invites", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listLiveEvents(type?: "debate" | "seminar", statusTab?: "live" | "ongoing" | "ended") {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (statusTab) params.set("statusTab", statusTab);
  return apiFetch<any[]>(`/api/v1/live-events${params.toString() ? `?${params.toString()}` : ""}`);
}

export async function startSeminarPptSession(payload: {
  student_id: string;
  board: string;
  class_number: string;
  chapter: number;
  title: string;
  subject?: string | null;
  term?: string | null;
  deck_ref?: string | null;
  tool?: "gslides" | "gradeup";
  request_id?: string;
}) {
  return apiFetch<any>("/api/v1/seminar/ppt/session/start", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      tool: payload.tool || "gradeup",
    }),
  });
}

export type SeminarPresentationSummary = {
  deckId: string;
  title: string;
  editUrl: string;
  embedUrl?: string;
  context?: {
    board?: string;
    class_number?: string;
    chapter?: number;
    subject?: string;
    term?: string | null;
  };
  revision: number;
  slideCount: number;
  sessionEnded: boolean;
  role: "owner" | "editor" | "viewer";
  createdAt: string;
  updatedAt: string;
};

export async function listSeminarPresentations() {
  return apiFetch<SeminarPresentationSummary[]>("/api/v1/seminar/decks");
}

export async function joinSeminarSession(payload: {
  sessionId: string;
  candidateId: string;
  candidateName: string;
  role?: string;
}) {
  return apiFetch<any>("/api/v1/seminar/join", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function removeSeminarParticipant(payload: {
  sessionId: string;
  candidateId: string;
  participantId: string;
}) {
  return apiFetch<any>("/api/v1/seminar/remove-participant", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function respondSeminar(payload: {
  sessionId: string;
  message?: string;
  transcript?: string;
  silenceSeconds?: number;
}) {
  return apiFetch<any>("/api/v1/seminar/respond", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function guideSeminar(sessionId: string) {
  return apiFetch<any>("/api/v1/seminar/guide", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export async function startSeminarChat(payload: { sessionId: string }) {
  return apiFetch<any>("/api/v1/seminar/chat/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function respondSeminarChat(payload: {
  sessionId: string;
  message: string;
}) {
  return apiFetch<any>("/api/v1/seminar/chat/respond", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendSeminarMessage(payload: {
  sessionId: string;
  candidateId: string;
  candidateName: string;
  message: string;
  role?: string;
}) {
  return apiFetch<any>("/api/v1/seminar/message", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function requestSeminarSpeakingAccess(payload: {
  sessionId: string;
  candidateId: string;
  candidateName: string;
}) {
  return apiFetch<any>("/api/v1/seminar/request-speak", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function respondSeminarSpeakingAccess(payload: {
  sessionId: string;
  candidateId: string;
  candidateName: string;
  participantId: string;
  participantName?: string;
  approved: boolean;
}) {
  return apiFetch<any>("/api/v1/seminar/respond-speak", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function endSeminar(sessionId: string) {
  return apiFetch<any>("/api/v1/seminar/end", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export async function endSeminarWithTranscript(payload: {
  sessionId: string;
  transcript?: string;
}) {
  return apiFetch<any>("/api/v1/seminar/end", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function explainHighlight(payload: {
  unitId: string;
  highlightedText: string;
}) {
  return apiFetch<any>("/api/v1/highlight/explain", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function summarizeHighlight(payload: {
  unitId: string;
  highlightedText: string;
}) {
  return apiFetch<any>("/api/v1/highlight/summarize", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function askHighlight(payload: {
  unitId: string;
  highlightedText: string;
  messages: Array<{ role: string; content: string }>;
}) {
  return apiFetch<any>("/api/v1/highlight/ask", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type AvatarFlashcardRequest = {
  flashcardId: string;
  flashcardType: "informative" | "mcq" | string;
  segmentId: string;
};

export async function startAvatarSession(payload: {
  unitId: string;
  sectionTitle: string;
  sectionId?: string | null;
  section_title?: string;
  board?: string | null;
  class_number?: string | null;
  subject?: string | null;
  unit_number?: number | string | null;
  unit_name?: string | null;
  term?: string | null;
}) {
  return apiFetch<any>("/api/v1/avatar/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function raiseAvatarHand(payload: {
  sessionId: string;
  studentDoubt?: string | null;
  studentResponse?: string | null;
  segmentId?: string | null;
}) {
  return apiFetch<any>("/api/v1/avatar/raise-hand", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function generateAvatarFlashcard(payload: {
  sessionId: string;
  flashCards: AvatarFlashcardRequest[];
}) {
  return apiFetch<any>("/api/v1/avatar/flashcard/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resumeAvatarSession(payload: { sessionId: string }) {
  return apiFetch<any>("/api/v1/avatar/resume", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function endAvatarSession(payload: { sessionId: string; unitId?: string; subjectGroupKey?: string; completed?: boolean }) {
  return apiFetch<any>("/api/v1/avatar/end", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export function endAvatarSessionKeepalive(payload: { sessionId: string }) {
  return fetch(buildApiUrl("/api/v1/avatar/end"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    keepalive: true,
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}
