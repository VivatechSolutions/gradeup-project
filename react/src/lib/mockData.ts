// Mock data for standalone frontend (no backend required)

export const mockUser = {
  id: 1,
  username: "demo_student",
  email: "demo@gradeup.com",
  firstName: "Demo",
  lastName: "Student",
  role: "student" as const,
  grade: 10,
  profileImage: null,
  points: 1250,
  streak: 7,
};

export const mockTeacher = {
  id: 2,
  username: "demo_teacher",
  email: "teacher@gradeup.com",
  firstName: "Sarah",
  lastName: "Johnson",
  role: "teacher" as const,
  grade: null,
  profileImage: null,
  points: 0,
  streak: 0,
};

export const mockSubjects = [
  { id: 1, name: "Mathematics", description: "Numbers and problem solving" },
  { id: 2, name: "Physics", description: "Laws of nature and motion" },
  { id: 3, name: "Chemistry", description: "Elements and compounds" },
  { id: 4, name: "Biology", description: "Life sciences" },
  { id: 5, name: "English Literature", description: "Classic and modern works" },
  { id: 6, name: "History", description: "World events and civilizations" },
  { id: 7, name: "Computer Science", description: "Programming and algorithms" },
];

interface Unit {
  id: number;
  name: string;
}

export const mockUnits: { [key: string]: Unit[] } = {
  "1": [{ id: 1, name: "Algebra Basics" }, { id: 2, name: "Linear Equations" }],
  "2": [{ id: 1, name: "Kinematics" }, { id: 2, name: "Dynamics" }],
  "3": [{ id: 1, name: "Atomic Structure" }, { id: 2, name: "Chemical Bonds" }],
  "4": [{ id: 1, name: "Cell Biology" }, { id: 2, name: "Genetics" }],
  "5": [{ id: 1, name: "Shakespeare" }, { id: 2, name: "Modern Poetry" }],
  "6": [{ id: 1, name: "Ancient Civilizations" }, { id: 2, name: "World War II" }],
  "7": [{ id: 1, name: "Data Structures" }, { id: 2, name: "Algorithms" }],
};

export const mockCourses = [
  {
    id: 1,
    title: "Algebra Fundamentals",
    description: "Master the basics of algebraic equations, expressions, and problem-solving techniques.",
    subjectId: 1,
    grade: 9,
    teacherId: 2,
    imageUrl: null,
    isPublished: true,
  },
  {
    id: 2,
    title: "Introduction to Physics",
    description: "Explore motion, forces, energy, and the fundamental laws that govern our universe.",
    subjectId: 2,
    grade: 9,
    teacherId: 2,
    imageUrl: null,
    isPublished: true,
  },
  {
    id: 3,
    title: "Organic Chemistry Basics",
    description: "Learn about carbon compounds, chemical reactions, and molecular structures.",
    subjectId: 3,
    grade: 10,
    teacherId: 2,
    imageUrl: null,
    isPublished: true,
  },
  {
    id: 4,
    title: "Cell Biology",
    description: "Discover the building blocks of life - cells, their structures, and functions.",
    subjectId: 4,
    grade: 10,
    teacherId: 2,
    imageUrl: null,
    isPublished: true,
  },
  {
    id: 5,
    title: "Shakespeare Studies",
    description: "Dive into the works of William Shakespeare and understand literary analysis.",
    subjectId: 5,
    grade: 11,
    teacherId: 2,
    imageUrl: null,
    isPublished: true,
  },
  {
    id: 6,
    title: "World War II History",
    description: "Comprehensive study of the causes, events, and aftermath of WWII.",
    subjectId: 6,
    grade: 11,
    teacherId: 2,
    imageUrl: null,
    isPublished: true,
  },
  {
    id: 7,
    title: "Python Programming",
    description: "Learn programming fundamentals using Python - from basics to intermediate concepts.",
    subjectId: 7,
    grade: 10,
    teacherId: 2,
    imageUrl: null,
    isPublished: true,
  },
  {
    id: 8,
    title: "Calculus I",
    description: "Introduction to differential and integral calculus concepts.",
    subjectId: 1,
    grade: 12,
    teacherId: 2,
    imageUrl: null,
    isPublished: true,
  },
];

export const mockEnrollments = [
  { id: 1, studentId: 1, courseId: 1, progress: 75, enrolledAt: "2024-01-15" },
  { id: 2, studentId: 1, courseId: 2, progress: 60, enrolledAt: "2024-01-20" },
  { id: 3, studentId: 1, courseId: 3, progress: 45, enrolledAt: "2024-02-01" },
  { id: 4, studentId: 1, courseId: 7, progress: 90, enrolledAt: "2024-02-10" },
];

export const mockLessons = [
  { id: 1, courseId: 1, title: "Introduction to Variables", content: "Learn about variables and expressions...", orderIndex: 1, duration: 30 },
  { id: 2, courseId: 1, title: "Solving Linear Equations", content: "Step-by-step equation solving...", orderIndex: 2, duration: 45 },
  { id: 3, courseId: 1, title: "Graphing Functions", content: "Understanding function graphs...", orderIndex: 3, duration: 40 },
  { id: 4, courseId: 2, title: "Motion and Velocity", content: "Understanding speed and movement...", orderIndex: 1, duration: 35 },
  { id: 5, courseId: 2, title: "Newton's Laws", content: "The three laws of motion...", orderIndex: 2, duration: 50 },
  { id: 6, courseId: 7, title: "Python Basics", content: "Variables, data types, and syntax...", orderIndex: 1, duration: 40 },
  { id: 7, courseId: 7, title: "Control Flow", content: "If statements and loops...", orderIndex: 2, duration: 45 },
  { id: 8, courseId: 7, title: "Functions", content: "Creating and using functions...", orderIndex: 3, duration: 50 },
];

export const mockAssignments = [
  {
    id: 1,
    title: "Algebra Problem Set 1",
    description: "Complete problems 1-20 from Chapter 3",
    courseId: 1,
    courseName: "Algebra Fundamentals",
    teacherName: "Sarah Johnson",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    maxScore: 100,
    instructions: "Show all your work. Partial credit will be given.",
    submissionType: "both" as const,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: "Physics Lab Report",
    description: "Write a lab report on the pendulum experiment",
    courseId: 2,
    courseName: "Introduction to Physics",
    teacherName: "Sarah Johnson",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    maxScore: 100,
    instructions: "Include hypothesis, procedure, results, and conclusion.",
    submissionType: "file" as const,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    title: "Python Coding Challenge",
    description: "Build a simple calculator program",
    courseId: 7,
    courseName: "Python Programming",
    teacherName: "Sarah Johnson",
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    maxScore: 100,
    instructions: "Your program should handle +, -, *, / operations.",
    submissionType: "file" as const,
    createdAt: new Date().toISOString(),
  },
];

export const mockSubmissions = [
  { id: 1, assignmentId: 3, content: "calculator.py submitted", submittedAt: new Date().toISOString(), score: 95, feedback: "Excellent work!" },
];

export const mockStreak = {
  currentStreak: 7,
  longestStreak: 14,
  lastActivityDate: new Date().toISOString(),
};

export const mockProgress = {
  totalPoints: 1250,
  level: 5,
  lessonsCompleted: 24,
  quizzesPassed: 12,
  averageScore: 87,
  timeSpent: 1840, // minutes
  weeklyGoal: 300,
  weeklyProgress: 180,
};

export const mockBadges = [
  { id: 1, name: "First Steps", description: "Complete your first lesson", icon: "trophy", earnedAt: "2024-01-15" },
  { id: 2, name: "Quick Learner", description: "Complete 10 lessons", icon: "zap", earnedAt: "2024-02-01" },
  { id: 3, name: "Math Whiz", description: "Score 90%+ on 5 math quizzes", icon: "calculator", earnedAt: "2024-02-15" },
  { id: 4, name: "Consistent", description: "Maintain a 7-day streak", icon: "flame", earnedAt: "2024-03-01" },
];

export const mockLeaderboard = [
  { rank: 1, username: "alex_star", firstName: "Alex", lastName: "Star", points: 2450, avatar: null },
  { rank: 2, username: "maria_learn", firstName: "Maria", lastName: "Learn", points: 2100 },
  { rank: 3, username: "demo_student", firstName: "Demo", lastName: "Student", points: 1250 },
  { rank: 4, username: "john_study", firstName: "John", lastName: "Study", points: 1100 },
  { rank: 5, username: "emma_bright", firstName: "Emma", lastName: "Bright", points: 980 },
];

export const mockCommunityPosts = [
  {
    id: 1,
    userId: 3,
    username: "alex_star",
    firstName: "Alex",
    content: "Just finished the calculus chapter! The integration techniques are really clicking now.",
    type: "achievement",
    likes: 12,
    comments: 3,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    userId: 4,
    username: "maria_learn",
    firstName: "Maria",
    content: "Can someone explain the difference between velocity and acceleration? I'm confused.",
    type: "question",
    likes: 5,
    comments: 8,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    userId: 5,
    username: "john_study",
    firstName: "John",
    content: "Study tip: Use the Pomodoro technique - 25 min work, 5 min break. It really helps!",
    type: "study_tip",
    likes: 24,
    comments: 6,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const mockTeacherStats = {
  totalStudents: 87,
  coursesCreated: 6,
  pendingAssignments: 12,
  classAverage: 82,
};

// Mock API response helper
export function getMockResponse(endpoint: string): any {
  const routes: Record<string, any> = {
    "/api/user": mockUser,
    "/api/subjects": mockSubjects,
    "/api/courses": mockCourses,
    "/api/student/enrollments": mockEnrollments,
    "/api/student/streak": mockStreak,
    "/api/student/progress": mockProgress,
    "/api/student/assignments": mockAssignments,
    "/api/student/submissions": mockSubmissions,
    "/api/student/badges": mockBadges,
    "/api/community/leaderboard": mockLeaderboard,
    "/api/community/posts": mockCommunityPosts,
    "/api/community/points": mockProgress.totalPoints,
    "/api/teacher/stats": mockTeacherStats,
    "/api/lessons": mockLessons,
  };

  // Handle dynamic routes
  if (endpoint.startsWith("/api/courses/")) {
    const courseId = parseInt(endpoint.split("/")[3]);
    return mockCourses.find(c => c.id === courseId);
  }

  return routes[endpoint] || null;
}
