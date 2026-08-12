export interface SeminarHistoryEntry {
  id: string;
  topic: string;
  date: string;
  participants: number;
  overallScore: number;
}

export const mockSeminarHistory: SeminarHistoryEntry[] = [
  {
    id: 'seminar-1',
    topic: 'The Future of Renewable Energy',
    date: '2026-06-25',
    participants: 15,
    overallScore: 88,
  },
  {
    id: 'seminar-2',
    topic: 'Impact of AI on Modern Education',
    date: '2026-06-18',
    participants: 22,
    overallScore: 92,
  },
  {
    id: 'seminar-3',
    topic: 'Quantum Computing: Hype vs. Reality',
    date: '2026-06-10',
    participants: 12,
    overallScore: 79,
  },
];
