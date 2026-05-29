import { Award, BrainCircuit, Calendar, CheckCircle, Clock, Coffee, Feather, Film, Flame, Rocket, Star, Telescope, Trophy, Zap } from 'lucide-react';

export interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  unlocked: boolean;
  date: string | null;
  tier: 'bronze' | 'silver' | 'gold';
}

export const mockAchievements: Achievement[] = [
  {
    id: 1,
    title: "First Steps",
    description: "Complete your first lesson.",
    icon: Rocket,
    unlocked: true,
    date: "2024-01-15",
    tier: 'bronze',
  },
  {
    id: 2,
    title: "Knowledge Explorer",
    description: "Finish a full course.",
    icon: Telescope,
    unlocked: true,
    date: "2024-02-20",
    tier: 'silver',
  },
  {
    id: 3,
    title: "Quiz Whiz",
    description: "Score 100% on any quiz.",
    icon: Zap,
    unlocked: true,
    date: "2024-03-10",
    tier: 'gold',
  },
  {
    id: 4,
    title: "Perfect Streak",
    description: "Maintain a 7-day learning streak.",
    icon: Flame,
    unlocked: true,
    date: "2024-03-22",
    tier: 'silver',
  },
  {
    id: 5,
    title: "Night Owl",
    description: "Study past midnight.",
    icon: Clock,
    unlocked: false,
    date: null,
    tier: 'bronze',
  },
  {
    id: 6,
    title: "Early Bird",
    description: "Complete a lesson before 7 AM.",
    icon: Feather,
    unlocked: true,
    date: "2024-04-01",
    tier: 'bronze',
  },
  {
    id: 7,
    title: "AI Companion",
    description: "Use the AI Tutor for 10 queries.",
    icon: BrainCircuit,
    unlocked: true,
    date: "2024-04-05",
    tier: 'silver',
  },
  {
    id: 8,
    title: "Consistent Learner",
    description: "Log in for 30 consecutive days.",
    icon: Calendar,
    unlocked: false,
    date: null,
    tier: 'gold',
  },
    {
    id: 9,
    title: "Weekend Warrior",
    description: "Complete 5 lessons over a single weekend.",
    icon: Star,
    unlocked: true,
    date: "2024-04-12",
    tier: 'silver',
  },
  {
    id: 10,
    title: "Debate Champion",
    description: "Win a match in the AI Debate Tool.",
    icon: Trophy,
    unlocked: false,
    date: null,
    tier: 'gold',
  },
  {
    id: 11,
    title: "Taskmaster",
    description: "Complete all assignments for a course on time.",
    icon: CheckCircle,
    unlocked: false,
    date: null,
    tier: 'silver',
  },
    {
    id: 12,
    title: "Thirsty for Knowledge",
    description: "Spend over 10 hours learning on the platform.",
    icon: Coffee,
    unlocked: true,
    date: "2024-04-18",
    tier: 'gold',
  },
];
