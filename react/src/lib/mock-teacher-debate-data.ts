export interface DebateHistoryEntry {
  id: string;
  topic: string;
  date: string;
  teamA: string[];
  teamB: string[];
  winner: 'Team A' | 'Team B' | 'Draw';
}

export const mockDebateHistory: DebateHistoryEntry[] = [
  {
    id: 'debate-1',
    topic: 'AI will replace most human jobs within 20 years',
    date: '2026-06-22',
    teamA: ['Alice', 'Bob'],
    teamB: ['Charlie', 'Dana'],
    winner: 'Team A',
  },
  {
    id: 'debate-2',
    topic: 'Social media does more harm than good',
    date: '2026-06-15',
    teamA: ['Eve', 'Frank'],
    teamB: ['Grace', 'Heidi'],
    winner: 'Team B',
  },
  {
    id: 'debate-3',
    topic: 'Nuclear energy is essential for climate change',
    date: '2026-06-08',
    teamA: ['Ivan', 'Judy'],
    teamB: ['Mallory', 'Niaj'],
    winner: 'Draw',
  },
];
