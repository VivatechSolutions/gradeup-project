import { mockDebateHistory } from "../lib/mock-teacher-debate-data";
export type { DebateHistoryEntry } from "../lib/mock-teacher-debate-data";

export type LibrarySubject = {
    subjectGroupKey: string;
    title: string;
    units: {
      id: string;
      unitNumber: number;
      unitTitle: string;
    }[];
};

const mockSubjects: LibrarySubject[] = [
    {
      subjectGroupKey: "science",
      title: "Science",
      units: [
        { id: "sci-1", unitNumber: 1, unitTitle: "Physics" },
        { id: "sci-2", unitNumber: 2, unitTitle: "Chemistry" },
        { id: "sci-3", unitNumber: 3, unitTitle: "Biology" },
      ],
    },
    {
      subjectGroupKey: "history",
      title: "History",
      units: [
        { id: "hist-1", unitNumber: 1, unitTitle: "Ancient History" },
        { id: "hist-2", unitNumber: 2, unitTitle: "World War II" },
      ],
    },
];

const mockTopics: Record<string, Record<string, any>> = {
    "science": {
        "1": {
            units: [{
                sections: [{
                    debate_topics: [
                        { topic_id: "sci-phys-1", topic_title: "Is light a wave or a particle?" },
                        { topic_id: "sci-phys-2", topic_title: "Should we invest more in nuclear fusion?" },
                    ]
                }]
            }]
        },
        "2": {
            units: [{
                sections: [{
                    debate_topics: [
                        { topic_id: "sci-chem-1", topic_title: "Are artificial sweeteners safe?" },
                    ]
                }]
            }]
        },
        "3": {
             units: [{
                sections: [{
                    debate_topics: [
                        { topic_id: "sci-bio-1", topic_title: "Is human cloning ethical?" },
                    ]
                }]
            }]
        }
    },
    "history": {
        "1": {
             units: [{
                sections: [{
                    debate_topics: [
                        { topic_id: "hist-ancient-1", topic_title: "Was the Roman Empire a force for good?" },
                    ]
                }]
            }]
        },
        "2": {
             units: [{
                sections: [{
                    debate_topics: [
                        { topic_id: "hist-ww2-1", topic_title: "Was the bombing of Dresden justified?" },
                    ]
                }]
            }]
        }
    }
};

export const getLibrarySubjects = async (): Promise<LibrarySubject[]> => {
    console.log("Mock API: getLibrarySubjects called");
    return new Promise(resolve => setTimeout(() => resolve(mockSubjects), 500));
};

export const getDebateTopics = async (subject: string, unitNumber: number): Promise<any> => {
    console.log(`Mock API: getDebateTopics called with subject: ${subject}, unit: ${unitNumber}`);
    const topics = mockTopics[subject]?.[unitNumber] || { units: [] };
    return new Promise(resolve => setTimeout(() => resolve(topics), 500));
};

export const getCandidateContext = async (data: {firstName: string, lastName: string}): Promise<{candidateId: string, candidateName: string}> => {
  console.log(`Mock API: getCandidateContext called with data:`, data);
  const candidateName = `${data.firstName} ${data.lastName}`.trim() || "Guest User";
  return { candidateId: `mock-id-${Date.now()}`, candidateName};
};

export const getDebateHistory = async (): Promise<DebateHistoryEntry[]> => {
  console.log(`Mock API: getDebateHistory called`);
  return mockDebateHistory;
};

export const startDebate = async (
  data: {candidateId: string, candidateName: string, topic: string}
): Promise<{ session_id: string; ai_greeting: string }> => {
  console.log(`Mock API: startDebate called with data:`, data);
  return { session_id: "mock-debate-123", ai_greeting: "Welcome to the mock debate! Let's discuss " + data.topic };
};

export const respondDebate = async (
  data: {sessionId: string, message: string}
): Promise<{ ai_response: string }> => {
  console.log(`Mock API: respondDebate called with data:`, data);
  return { ai_response: `This is a mock AI response to your argument about "${data.message.substring(0, 20)}...".` };
};

export const endDebate = async (sessionId: string): Promise<any> => {
  console.log(`Mock API: endDebate called for session: ${sessionId}`);
  return {
    scores: { student: 85, ai: 78 },
    feedback: { scores: { argument: 9, clarity: 8 }, },
    recommendations: ["Try to use more specific examples."]
  };
};

export const createDebateRoom = async (
  data: {candidateId: string, candidateName: string, topic: string, maxParticipants: number}
): Promise<{ session_id: string }> => {
  console.log(`Mock API: createDebateRoom called with data:`, data);
  return { session_id: "mock-room-456" };
};

export const joinDebateRoom = async (
  userId: string,
  roomId: string
): Promise<{ success: boolean; message?: string }> => {
  console.log(`Mock API: joinDebateRoom called by user: ${userId} for room: ${roomId}`);
  return { success: true };
};

export const startDebateRoom = async (teacherId: string, roomId: string): Promise<void> => {
  console.log(`Mock API: startDebateRoom called by teacher: ${teacherId} for room: ${roomId}`);
};

export const completeDebateRoomOpening = async (teacherId: string, roomId: string): Promise<void> => {
  console.log(`Mock API: completeDebateRoomOpening called by teacher: ${teacherId} for room: ${roomId}`);
};

export const submitDebateRoomTurn = async (
  roomId: string,
  userId: string,
  turnContent: string
): Promise<void> => {
  console.log(`Mock API: submitDebateRoomTurn called for room: ${roomId}, user: ${userId}, content: ${turnContent}`);
};

export const endDebateRoom = async (teacherId: string, roomId: string): Promise<void> => {
  console.log(`Mock API: endDebateRoom called by teacher: ${teacherId} for room: ${roomId}`);
};

export const synthesizeDebateSpeech = async (text: string): Promise<string> => {
  console.log(`Mock API: synthesizeDebateSpeech called with text: "${text.substring(0, 50)}..."`);
  return "mock-audio-url";
};

export const transcribeDebateAudio = async (audio: Blob): Promise<{text: string}> => {
  console.log(`Mock API: transcribeDebateAudio called with audio blob`);
  return new Promise(resolve => setTimeout(() => resolve({text: "This is a mock transcription of the audio."}), 1000));
};
