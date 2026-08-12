// ─── TYPES ───────────────────────────────────────────────────────────────────────

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  class: string;
  section: string;
  photo: string;
  email: string;
  lastActive: string; // ISO 8601 date string
  loginFrequency: number; // logins per week
}

export interface FeatureUsage {
  feature: string; // e.g., 'AI Tutor', 'Quizzes', 'Book Gallery'
  timeSpent: number; // in minutes
}

export interface StudentAnalytics extends Student {
  totalLearningTime: number; // in minutes
  progress: number; // percentage
  engagementScore: number; // out of 100
  featureUsage: FeatureUsage[];
  activityHistory: {
    date: string; // YYYY-MM-DD
    timeSpent: number; // in minutes
  }[];
}

export interface ClassAnalytics {
  class: string;
  section: string;
  totalStudents: number;
  totalLearningTime: number; // in minutes
  avgTimePerStudent: number; // in minutes
  mostUsedFeature: string;
  leastUsedFeature: string;
  activeStudents: number;
  inactiveStudents: number;
}

export interface DashboardAnalytics {
  totalStudents: number;
  activeStudents: number;
  totalLearningHours: number;
  avgUsageTime: number; // in minutes
  featureEngagementRate: { feature: string; rate: number }[];
  studentCompletionRate: number; // percentage
}

// ─── MOCK DATA GENERATION ────────────────────────────────────────────────────────

const studentNames = [
  "Aarav Sharma", "Vivaan Singh", "Aditya Kumar", "Ishaan Patel", "Diya Gupta", "Ananya Reddy",
  "Aryan Joshi", "Riya Malhotra", "Kabir Verma", "Myra Chauhan", "Priya Nair", "Rohan Mehta",
  "Saanvi Desai", "Arjun Pillai", "Anika Menon", "Krish Iyer", "Zara Khan", "Advik Rao"
];

const classes = [
  { class: "10", section: "A" },
  { class: "10", section: "B" },
  { class: "11", section: "A" },
  { class: "12", section: "A" },
  { class: "12", section: "B" },
];

// This is a temporary copy from sidebar.tsx to avoid circular dependencies.
// Ideally, this would be in a shared location.
type MenuItem = { section: string; } | { label: string; href: string; icon: string; color: string; children?: { label: string; href: string; }[]; };
const isSection = (item: MenuItem): item is { section: string; } => "section" in item;

const STUDENT_MENU: MenuItem[] = [
  { section: "Main" },
  { label:"Dashboard",     href:"/dashboard",       icon:"home",     color:"cv" },
  { label:"Progress",      href:"/progress",        icon:"chart",    color:"cb" },
  { section: "Tools" },
  { label:"AI Tutor",      href:"/ai-tutor",        icon:"bot",      color:"ce" },
  { label:"Book Library",  href:"/bookExpanded",    icon:"book",     color:"cc" },
  { label:"Homework",      href:"/homework",         icon:"file",     color:"ca" },
  { label:"Community",     href:"/community",        icon:"msg",      color:"cp" },
  { label:"Group Chat", href:"/communityNew", icon:"users", color:"cp" },
  { label:"Debate",        href:"/debatePage",      icon:"debateNew",   color:"ca" },
  { label: "Meeting", href: "/meetingPage", icon: "video", color: "cs" },
  { label: "Seminar", href: "/seminarPage", icon: "presentation", color: "ct" },
  { label:"Exams", href:"/exam-preparation", icon:"examNew", color:"ci", children:[
    { label:"Prep",      href:"/exam-preparation" },
    { label:"Main Exam", href:"/main-exam" },
  ]},
  { label:"Extras",     href:"/bookGuide",        icon:"grad",     color:"cl" },
  { label: "Calendar",    href: "/calendar",    icon: "calendar", color:"cc"  }
];

const excludedFeatures = new Set(["Dashboard", "Progress", "Homework", "Community", "Group Chat", "Achievements", "Meeting", "Calendar"]);

const features = STUDENT_MENU
  .filter(item => !isSection(item) && !excludedFeatures.has(item.label))
  .map(item => (item as {label: string}).label);

const generateRandomDate = (start: Date, end: Date): string => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
};

const createActivityHistory = (totalTime: number) => {
  const history: { date: string, timeSpent: number }[] = [];
  let remainingTime = totalTime;
  for (let i = 0; i < 30; i++) {
    if (remainingTime <= 0) break;
    const date = new Date();
    date.setDate(date.getDate() - i);
    const timeSpent = Math.random() > 0.3 ? Math.min(remainingTime, Math.floor(Math.random() * 90) + 15) : 0;
    if (timeSpent > 0) {
      history.push({
        date: date.toISOString().split("T")[0],
        timeSpent,
      });
      remainingTime -= timeSpent;
    }
  }
  return history;
};

export const mockStudents: Student[] = studentNames.map((name, index) => {
  const classInfo = classes[index % classes.length];
  return {
    id: `S${(index + 1).toString().padStart(3, '0')}`,
    name,
    rollNumber: `${classInfo.class}0${index + 1}`,
    class: classInfo.class,
    section: classInfo.section,
    photo: `https://i.pravatar.cc/150?img=${index + 1}`,
    email: `${name.split(' ')[0].toLowerCase()}@example.com`,
    lastActive: generateRandomDate(new Date(new Date().getTime() - 15 * 24 * 60 * 60 * 1000), new Date()),
    loginFrequency: Math.floor(Math.random() * 10) + 1,
  };
});

export const mockStudentAnalytics: StudentAnalytics[] = mockStudents.map(student => {
  const totalLearningTime = Math.floor(Math.random() * 3000) + 500; // 500 to 3500 minutes

  const featureUsage: FeatureUsage[] = [];
  let timePool = totalLearningTime;
  const featureCopy = [...features];
  while(timePool > 0 && featureCopy.length > 0) {
      const randomFeatureIndex = Math.floor(Math.random() * featureCopy.length);
      const feature = featureCopy.splice(randomFeatureIndex, 1)[0];
      const time = Math.min(timePool, Math.floor(Math.random() * (timePool / 2)) + 50);
      featureUsage.push({ feature, timeSpent: time });
      timePool -= time;
  }
  // Assign remaining time to the first feature
  if(timePool > 0 && featureUsage.length > 0) {
      featureUsage[0].timeSpent += timePool;
  }


  return {
    ...student,
    totalLearningTime,
    progress: Math.floor(Math.random() * 80) + 20,
    engagementScore: Math.floor(Math.random() * 70) + 30,
    featureUsage,
    activityHistory: createActivityHistory(totalLearningTime),
  };
});

export const mockClassAnalytics: ClassAnalytics[] = classes.map(({ class: className, section }) => {
  const classStudents = mockStudentAnalytics.filter(s => s.class === className && s.section === section);
  if (classStudents.length === 0) {
    return {
        class: className,
        section: section,
        totalStudents: 0,
        totalLearningTime: 0,
        avgTimePerStudent: 0,
        mostUsedFeature: "N/A",
        leastUsedFeature: "N/A",
        activeStudents: 0,
        inactiveStudents: 0,
    }
  }

  const totalLearningTime = classStudents.reduce((acc, s) => acc + s.totalLearningTime, 0);
  const featureTimes: { [key: string]: number } = {};
  classStudents.forEach(s => {
    s.featureUsage.forEach(fu => {
      if (!featureTimes[fu.feature]) featureTimes[fu.feature] = 0;
      featureTimes[fu.feature] += fu.timeSpent;
    });
  });

  const sortedFeatures = Object.entries(featureTimes).sort(([, a], [, b]) => a - b);

  const activeStudents = classStudents.filter(s => {
    const lastActiveDate = new Date(s.lastActive);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return lastActiveDate > sevenDaysAgo;
  }).length;

  return {
    class: className,
    section: section,
    totalStudents: classStudents.length,
    totalLearningTime,
    avgTimePerStudent: Math.floor(totalLearningTime / classStudents.length),
    mostUsedFeature: sortedFeatures.length > 0 ? sortedFeatures[sortedFeatures.length - 1][0] : 'N/A',
    leastUsedFeature: sortedFeatures.length > 0 ? sortedFeatures[0][0] : 'N/A',
    activeStudents,
    inactiveStudents: classStudents.length - activeStudents,
  };
});

export const mockDashboardAnalytics: DashboardAnalytics = (() => {
    const totalStudents = mockStudentAnalytics.length;
    const totalLearningTime = mockStudentAnalytics.reduce((acc, s) => acc + s.totalLearningTime, 0);
    const totalLearningHours = Math.floor(totalLearningTime / 60);
    const activeStudents = mockClassAnalytics.reduce((acc, c) => acc + c.activeStudents, 0);
    const avgUsageTime = Math.floor(totalLearningTime / totalStudents);

    const featureEngagement: {[key: string]: number} = {};
    mockStudentAnalytics.forEach(student => {
        student.featureUsage.forEach(fu => {
            if(!featureEngagement[fu.feature]) featureEngagement[fu.feature] = 0;
            featureEngagement[fu.feature]++;
        })
    });

    const featureEngagementRate = Object.entries(featureEngagement).map(([feature, count]) => ({
        feature,
        rate: Math.round((count / totalStudents) * 100)
    })).sort((a,b) => b.rate - a.rate);


    const studentCompletionRate = Math.round(mockStudentAnalytics.reduce((acc, s) => acc + s.progress, 0) / totalStudents);

    return {
        totalStudents,
        activeStudents,
        totalLearningHours,
        avgUsageTime,
        featureEngagementRate,
        studentCompletionRate,
    }
})();
