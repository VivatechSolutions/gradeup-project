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

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const isFormDataBody =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(buildApiUrl(url), {
    ...init,
    headers: {
      ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
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
  return apiFetch<any>("/api/v1/student/dashboard");
}

export async function getStudentProgressSummary() {
  return apiFetch<any>("/api/v1/student/progress/summary");
}

export async function getStudentAchievements() {
  return apiFetch<any[]>("/api/v1/student/achievements");
}

export async function recordStudentProgress(payload: {
  activityType: string;
  subjectGroupKey?: string;
  bookId?: string;
  unitId?: string;
  status?: string;
  progressPercent?: number;
  score?: number;
  timeSpentMinutes?: number;
  metadata?: any;
}) {
  return apiFetch<any>("/api/v1/student/progress/content", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getLibrarySubjectDetail(subjectGroupKey: string) {
  return apiFetch<LibrarySubject>(
    `/api/v1/library/subjects/${encodeURIComponent(subjectGroupKey)}`,
  );
}

export async function getUnitContent(
  unitId: string,
  format: "structured" | "enriched" = "enriched",
) {
  return apiFetch<{
    unit: LibraryUnit;
    format: "structured" | "enriched";
    content: any;
  }>(
    `/api/v1/library/units/${encodeURIComponent(unitId)}/content?format=${format}`,
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
  subject?: string | null;
  unit_number?: number | null;
  board?: string | null;
  class_number?: string | null;
  term?: string | null;
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
  subject?: string | null;
  unitNumber?: number | null;
  board?: string | null;
  classNumber?: string | null;
  term?: string | null;
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

export async function startSeminarPptSession(payload: {
  student_id: string;
  board: string;
  class_number: string;
  chapter: number;
  title: string;
  subject?: string | null;
  term?: string | null;
  deck_ref?: string | null;
  tool?: "gslides";
}) {
  return apiFetch<any>("/api/v1/seminar/ppt/session/start", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      tool: payload.tool || "gslides",
    }),
  });
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

export async function endAvatarSession(payload: { sessionId: string }) {
  return apiFetch<any>("/api/v1/avatar/end", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
