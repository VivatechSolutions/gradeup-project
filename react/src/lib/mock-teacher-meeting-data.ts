export interface MeetingHistoryEntry {
  id: string;
  topic: string;
  subject: string;
  date: string;
  participants: number;
  duration: string; // e.g., "45 min"
}

export const mockMeetingHistory: MeetingHistoryEntry[] = [
  {
    id: 'meeting-1',
    topic: 'Q&A Session for Exam 1',
    subject: 'Physics',
    date: '2026-06-24',
    participants: 25,
    duration: '60 min',
  },
  {
    id: 'meeting-2',
    topic: 'Organic Chemistry Nomenclature',
    subject: 'Chemistry',
    date: '2026-06-20',
    participants: 18,
    duration: '45 min',
  },
  {
    id: 'meeting-3',
    topic: 'Calculus Problem Solving',
    subject: 'Mathematics',
    date: '2026-06-16',
    participants: 30,
    duration: '90 min',
  },
];
