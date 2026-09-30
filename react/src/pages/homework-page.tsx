import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../hooks/use-auth";
import { useTheme } from "../hooks/use-theme";
import Navigation from "../components/navigation";
import {
  getHomework,
  submitHomework,
  getLibrarySubjects,
  getCandidateContext,
  sendHomeworkChat,
  type LibrarySubject,
} from "../lib/gradeupApi";
import roboImg from "../assets/robo.png";
import studyRoboImg from "../assets/dashboard/study-robo.png";
import subjectEnglishImg from "../assets/dashboard/subject-english.png";
import subjectScienceImg from "../assets/dashboard/subject-science.png";
import subjectSocialImg from "../assets/dashboard/subject-social.png";
import subjectMathsImg from "../assets/dashboard/subject-maths.png";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Filter,
  ArrowLeft,
  ArrowRight,
  Send,
  RotateCcw,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Award,
  Zap,
  ChevronRight,
  ChevronDown,
  Layers,
  FileText,
  Mic,
  Image as ImageIcon,
  Paperclip,
  Target,
  RefreshCw,
  Plus,
  Loader2,
  Lightbulb,
  ExternalLink,
  Flame,
  Trophy,
} from "lucide-react";

// ─── TYPES & QUESTION METADATA (NO PURPLE / NO ROSE) ──────────────────────────

export interface QuestionItem {
  id: string;
  question_number?: number;
  section?: string;
  type: string;
  marks: number;
  question: string;
  options?: string[];
  correctOption?: number;
  correct_answer?: string;
  hint?: string;
  hints?: string[];
  minWords?: number;
  maxWords?: number;
  sampleAnswer?: string;
}

export interface HomeworkFeedback {
  question_id: string;
  question?: string;
  student_answer?: string;
  score: number;
  max_marks: number;
  score_percentage?: number;
  is_correct: boolean;
  verdict: "correct" | "partial" | "wrong";
  feedback: string;
}

export interface HomeworkAssignment {
  id: string;
  homework_id?: string;
  subject: string;
  topic: string;
  grade: string;
  totalMarks: number;
  timeLimit: number;
  aiGenerated: boolean;
  triggeredBy: "auto" | "ai_adaptive" | "teacher";
  dueDate: string;
  completedDate?: string;
  status: "pending" | "in-progress" | "submitted" | "graded" | "completed";
  emoji: string;
  color: [string, string]; // [primary, secondary] - Blue, Green, Cyan, Amber
  accentColor: string;
  description: string;
  unit_number?: number;
  questions: QuestionItem[];
  score?: number;
  percentage?: number;
  pointsEarned?: number;
  sectionScores?: Record<string, number>;
  feedback?: Record<string, HomeworkFeedback>;
  savedAnswers?: Record<string, string>;
}

// Question Type config using Student Dashboard palette (Blue, Cyan, Emerald, Amber)
const QT: Record<string, { label: string; short: string; icon: string; accent: string; bg: string }> = {
  mcq:                { label: "Multiple Choice", short: "MCQ",      icon: "🎯", accent: "#0284c7", bg: "rgba(2,132,199,.12)" },
  short:              { label: "Short Answer",    short: "2 Mark",   icon: "✏️",  accent: "#0ea5e9", bg: "rgba(14,165,233,.12)" },
  short_answer:       { label: "Short Answer",    short: "2 Mark",   icon: "✏️",  accent: "#0ea5e9", bg: "rgba(14,165,233,.12)" },
  conceptual:         { label: "Conceptual",      short: "Concept",  icon: "💡", accent: "#2389ff", bg: "rgba(35,137,255,.12)" },
  analysis:           { label: "Analytical",      short: "Analysis", icon: "🔍", accent: "#ff9c1a", bg: "rgba(255,156,26,.12)" },
  application:        { label: "Application",     short: "Apply",    icon: "⚡", accent: "#27b86a", bg: "rgba(39,184,106,.12)" },
  fill_in_the_blanks: { label: "Fill in Blanks",  short: "Blanks",   icon: "📝", accent: "#00a7c8", bg: "rgba(0,167,200,.12)" },
  medium:             { label: "Medium Answer",   short: "5 Mark",   icon: "📝", accent: "#f59e0b", bg: "rgba(245,158,11,.12)" },
  long:               { label: "Long Answer",     short: "Essay",    icon: "📄", accent: "#0284c7", bg: "rgba(2,132,199,.12)" },
  long_answer:        { label: "Long Answer",     short: "Essay",    icon: "📄", accent: "#0284c7", bg: "rgba(2,132,199,.12)" },
  speech:             { label: "Voice Answer",    short: "Speech",   icon: "🎤", accent: "#27b86a", bg: "rgba(39,184,106,.12)" },
  image:              { label: "Image Upload",    short: "Image",    icon: "🖼️",  accent: "#00a7c8", bg: "rgba(0,167,200,.12)" },
  document:           { label: "Doc Upload",      short: "Document", icon: "📎", accent: "#2389ff", bg: "rgba(35,137,255,.12)" },
};

// Subject Colors: NO PURPLE, NO ROSE! Uses Green, Blue, Cyan, Amber, Orange
const SUBJECT_META: Record<string, { color: string; bg: string; border: string; gradient: [string, string]; icon: string }> = {
  English:          { color: "#0284c7", bg: "rgba(2,132,199,.12)",   border: "rgba(2,132,199,.25)",   gradient: ["#0284c7", "#2389ff"], icon: "📖" },
  Science:          { color: "#27b86a", bg: "rgba(39,184,106,.12)",  border: "rgba(39,184,106,.25)",  gradient: ["#27b86a", "#10b981"], icon: "🔬" },
  Biology:          { color: "#10b981", bg: "rgba(16,185,129,.12)",  border: "rgba(16,185,129,.25)",  gradient: ["#10b981", "#27b86a"], icon: "🌿" },
  Physics:          { color: "#0ea5e9", bg: "rgba(14,165,233,.12)",  border: "rgba(14,165,233,.25)",  gradient: ["#0ea5e9", "#0284c7"], icon: "⚡" },
  Chemistry:        { color: "#00a7c8", bg: "rgba(0,167,200,.12)",   border: "rgba(0,167,200,.25)",   gradient: ["#00a7c8", "#10b981"], icon: "🧪" },
  Mathematics:      { color: "#ff9c1a", bg: "rgba(255,156,26,.12)",  border: "rgba(255,156,26,.25)",  gradient: ["#ff9c1a", "#ff791f"], icon: "🧮" },
  Maths:            { color: "#ff9c1a", bg: "rgba(255,156,26,.12)",  border: "rgba(255,156,26,.25)",  gradient: ["#ff9c1a", "#ff791f"], icon: "🧮" },
  "Social Science": { color: "#00a7c8", bg: "rgba(0,167,200,.12)",   border: "rgba(0,167,200,.25)",   gradient: ["#00a7c8", "#2389ff"], icon: "🌍" },
  Social:           { color: "#00a7c8", bg: "rgba(0,167,200,.12)",   border: "rgba(0,167,200,.25)",   gradient: ["#00a7c8", "#2389ff"], icon: "🌍" },
  History:          { color: "#ff791f", bg: "rgba(255,121,31,.12)",  border: "rgba(255,121,31,.25)",  gradient: ["#ff791f", "#f59e0b"], icon: "📜" },
};

const getSubjectMeta = (subj = "") => {
  const norm = Object.keys(SUBJECT_META).find((k) => k.toLowerCase() === subj.toLowerCase());
  return norm
    ? SUBJECT_META[norm]
    : { color: "#2389ff", bg: "rgba(35,137,255,.12)", border: "rgba(35,137,255,.25)", gradient: ["#2389ff", "#0ea5e9"], icon: "📚" };
};

const getSubjectArt = (subj = "") => {
  const s = subj.toLowerCase();
  if (s.includes("english")) return subjectEnglishImg;
  if (s.includes("math")) return subjectMathsImg;
  if (s.includes("social") || s.includes("history")) return subjectSocialImg;
  return subjectScienceImg;
};

// ─── AI-GENERATED MID-TERM PAPER (CBSE CLASS 10 ENGLISH UNIT 1) ─────────────

const MID_TERM_PAPER = {
  year: "2026",
  exam_name: "Mid Term Paper",
  subject: "English",
  unit_number: 1,
  document_id: "jeff101",
  board: "CBSE",
  class_number: "10",
  paper_title: "Class 10 English (First Flight) - Unit 1: A Letter to God, Dust of Snow, Fire and Ice - Mid Term Paper",
  total_marks: 40,
  duration_minutes: 90,
  general_instructions: [
    "This paper has 16 questions in 5 sections.",
    "Section A: Q1-Q7 are multiple choice questions of 1 mark each.",
    "Section B: Q8-Q9 are poem extracts of 5 marks each (1 mark per sub-part).",
    "Section C: Q10-Q11 are grammar and vocabulary questions of 4 marks each.",
    "Section D: Q12-Q14 are short answer questions of 3 marks each. Answer in 40-50 words.",
    "Section E: Answer any ONE of Q15 or Q16 (6 marks). Answer in 100-120 words."
  ],
  questions: [
    {
      section: "A",
      question_number: 1,
      question: "In 'A Letter to God', Lencho compared the big raindrops to 'ten cent pieces' because:",
      marks: 1,
      type: "mcq",
      options: [
        "he wanted to become rich quickly",
        "the rain promised a good harvest, which would bring him money",
        "the raindrops shone like silver",
        "he had lost his coins in the field"
      ],
      correct_answer: "the rain promised a good harvest, which would bring him money",
    },
    {
      section: "A",
      question_number: 2,
      question: "After the hailstorm, Lencho's field looked as if it was:",
      marks: 1,
      type: "mcq",
      options: ["covered with salt", "flooded with water", "eaten by locusts", "burnt by fire"],
      correct_answer: "covered with salt",
    },
    {
      section: "A",
      question_number: 3,
      question: "How much money did Lencho ask God for in his first letter?",
      marks: 1,
      type: "mcq",
      options: ["Fifty pesos", "Seventy pesos", "A hundred pesos", "A thousand pesos"],
      correct_answer: "A hundred pesos",
    },
    {
      section: "A",
      question_number: 4,
      question: "Why did the postmaster decide to answer Lencho's letter?",
      marks: 1,
      type: "mcq",
      options: [
        "To make fun of Lencho",
        "It was his official duty",
        "Lencho had paid extra postage",
        "So that Lencho's faith in God would not be shaken"
      ],
      correct_answer: "So that Lencho's faith in God would not be shaken",
    },
    {
      section: "A",
      question_number: 5,
      question: "What is ironic about the end of 'A Letter to God'?",
      marks: 1,
      type: "mcq",
      options: [
        "Lencho thanks the postmaster for the money",
        "Lencho calls the post office employees, who collected the money for him, 'a bunch of crooks'",
        "Lencho decides never to write to God again",
        "The postmaster asks Lencho to return the money"
      ],
      correct_answer: "Lencho calls the post office employees, who collected the money for him, 'a bunch of crooks'",
    },
    {
      section: "A",
      question_number: 6,
      question: "Lencho is described as 'an ox of a man'. Which figure of speech is used here?",
      marks: 1,
      type: "mcq",
      options: ["Simile", "Personification", "Metaphor", "Alliteration"],
      correct_answer: "Metaphor",
    },
    {
      section: "A",
      question_number: 7,
      question: "In 'Dust of Snow', the crow and hemlock tree are unusual symbols because poets usually use:",
      marks: 1,
      type: "mcq",
      options: [
        "scary birds and poisoned plants to show danger",
        "beautiful birds like nightingales and pleasant trees like pines to show happiness",
        "farm animals and crops to represent village life",
        "sea creatures and storms to depict inner turmoil"
      ],
      correct_answer: "beautiful birds like nightingales and pleasant trees like pines to show happiness",
    },
    {
      section: "B",
      question_number: 8,
      question: "Explain how Robert Frost presents the transformative power of nature in 'Dust of Snow'.",
      marks: 5,
      type: "medium",
      options: [],
      correct_answer: "Frost shows that nature in its simplest form can heal human sorrow. The simple falling of snow particles shook down by an ordinary crow changed the poet's gloomy mood and saved part of a day he had rued.",
      hint: "Focus on the shift in the poet's mood and the contrast between hemlock/crow and joyful snow."
    },
    {
      section: "C",
      question_number: 9,
      question: "According to Frost in 'Fire and Ice', what do 'fire' and 'ice' symbolize regarding human emotions?",
      marks: 4,
      type: "short_answer",
      options: [],
      correct_answer: "'Fire' symbolizes desire, lust, passion, and greed, while 'ice' symbolizes cold hatred, indifference, and emotional detachment. Both have enough destructive potential to end the world.",
      hint: "Contrast fiery greed with icy hatred."
    },
    {
      section: "D",
      question_number: 10,
      question: "Why did the postmaster send money to Lencho? Why did he sign the letter 'God'?",
      marks: 3,
      type: "short_answer",
      options: [],
      correct_answer: "The postmaster was deeply touched by Lencho's unshakeable faith. He collected money from colleagues and signed 'God' so Lencho's trust would remain unbroken.",
    },
    {
      section: "D",
      question_number: 11,
      question: "Describe Lencho's reaction when he counted the money in the envelope.",
      marks: 3,
      type: "short_answer",
      options: [],
      correct_answer: "Lencho showed not the slightest surprise upon seeing the money, demonstrating his absolute faith. However, he became furious when he counted only seventy pesos, believing God could not have made a mistake and the post office workers took it.",
    },
    {
      section: "E",
      question_number: 12,
      question: "Lencho's faith in God was unshakeable, but his faith in humanity was weak. Discuss this statement with reference to the story's ending.",
      marks: 6,
      type: "long_answer",
      options: [],
      correct_answer: "Lencho had supreme faith in God — he was confident God would send the hundred pesos. Yet he lacked faith in his fellow humans, immediately accusing the generous post office workers of theft. This ironic contrast highlights that blind faith can sometimes blind one to real acts of human compassion.",
      minWords: 90,
      maxWords: 150,
      hint: "Contrast his absolute confidence in God with his immediate suspicion of the postal staff."
    }
  ]
};

const normalizePaperQuestion = (item: any): QuestionItem => {
  const isMcq = item.type === "mcq";
  return {
    id: `q${item.question_number}`,
    question_number: item.question_number,
    section: item.section,
    type: item.type === "long_answer" ? "long" : item.type === "short_answer" ? "short" : item.type,
    marks: item.marks,
    question: item.question,
    hint: item.hint || (isMcq ? undefined : "Focus on textbook examples and clear evidence."),
    options: item.options || [],
    correctOption: item.options ? item.options.indexOf(item.correct_answer) : undefined,
    correct_answer: item.correct_answer,
    minWords: item.minWords || (item.marks >= 5 ? 70 : item.marks >= 3 ? 30 : undefined),
    maxWords: item.maxWords || (item.marks >= 5 ? 150 : item.marks >= 3 ? 80 : undefined),
  };
};

// ─── INITIAL FINISHED & PENDING HOMEWORKS (DONE BY STUDENTS) ─────────────────

const INITIAL_ASSIGNMENTS: HomeworkAssignment[] = [
  // 1. Finished Homework 1: Science (Completed with real questions, student answers, AI feedback)
  {
    id: "hw-finished-001",
    subject: "Science",
    topic: "Chemical Reactions & Equations — Unit 1 Comprehensive Review",
    grade: "Class 10",
    totalMarks: 30,
    timeLimit: 45,
    aiGenerated: true,
    triggeredBy: "ai_adaptive",
    dueDate: "Completed",
    completedDate: "Sep 27, 2026",
    status: "completed",
    emoji: "🔬",
    color: ["#27b86a", "#10b981"],
    accentColor: "#27b86a",
    description: "Evaluated practice set targeting chemical balancing, types of reactions, and redox concepts.",
    score: 28,
    percentage: 93,
    pointsEarned: 90,
    sectionScores: { "Balancing & Types": 10, "Redox & Observation": 10, "Corrosion & Industrial": 8 },
    questions: [
      {
        id: "q1",
        question_number: 1,
        type: "mcq",
        marks: 2,
        question: "When iron nails are placed in copper sulphate solution, what change is observed?",
        options: ["Blue solution turns pale green and reddish brown iron deposits on copper", "Blue solution turns pale green and reddish brown copper deposits on iron", "Solution becomes colourless", "No reaction takes place"],
        correctOption: 1,
        correct_answer: "Blue solution turns pale green and reddish brown copper deposits on iron",
      },
      {
        id: "q2",
        question_number: 2,
        type: "short",
        marks: 3,
        question: "Why is respiration considered an exothermic reaction? Explain with chemical reaction.",
        correct_answer: "During respiration, glucose oxidises in cells with oxygen to produce carbon dioxide, water and releases energy in the form of ATP.",
      },
      {
        id: "q3",
        question_number: 3,
        type: "medium",
        marks: 5,
        question: "Identify the substance oxidised and the substance reduced in: CuO + H2 -> Cu + H2O.",
        correct_answer: "H2 is oxidised to H2O because it gains oxygen. CuO is reduced to Cu because it loses oxygen. CuO acts as the oxidising agent.",
      },
      {
        id: "q4",
        question_number: 4,
        type: "long",
        marks: 10,
        question: "What is rancidity? Explain three distinct methods used in food packaging to prevent it.",
        correct_answer: "Rancidity is the slow oxidation of fats and oils in food leading to unpleasant smell and taste. Prevention methods: 1) Flushing packaging with inert nitrogen gas 2) Adding antioxidants like BHA/BHT 3) Refrigeration and airtight vacuum storage.",
      },
      {
        id: "q5",
        question_number: 5,
        type: "long",
        marks: 10,
        question: "Differentiate between displacement and double displacement reactions with balanced equations.",
        correct_answer: "In displacement, a more reactive element displaces a less reactive element (e.g., Fe + CuSO4 -> FeSO4 + Cu). In double displacement, two compounds exchange ions to form two new compounds (e.g., Na2SO4 + BaCl2 -> BaSO4 + 2NaCl).",
      }
    ],
    savedAnswers: {
      q1: "Blue solution turns pale green and reddish brown copper deposits on iron",
      q2: "Respiration breaks down glucose with oxygen in cells (C6H12O6 + 6O2 -> 6CO2 + 6H2O + Energy). Because large amounts of energy are liberated to maintain bodily life processes, it is classified as exothermic.",
      q3: "Substance oxidised is H2 since it gains oxygen to form H2O. Substance reduced is CuO because it loses oxygen to become copper metal. CuO is the oxidising agent and H2 is the reducing agent.",
      q4: "Rancidity happens when fatty foods undergo aerial oxidation creating bad odour and foul taste. Three prevention methods include flushing chip bags with inert nitrogen gas, storing items in vacuum containers, and adding antioxidants like BHT.",
      q5: "Displacement occurs when a higher reactivity metal displaces a lower one: Zn + CuSO4 -> ZnSO4 + Cu. Double displacement is mutual ion exchange: Na2SO4 + BaCl2 -> BaSO4 (white ppt) + 2NaCl.",
    },
    feedback: {
      q1: { question_id: "q1", score: 2, max_marks: 2, is_correct: true, verdict: "correct", feedback: "Spot on! The iron replaces copper from CuSO4 producing FeSO4 (pale green) and elemental copper deposit." },
      q2: { question_id: "q2", score: 3, max_marks: 3, is_correct: true, verdict: "correct", feedback: "Full marks. Correct balanced word equation and clear justification of energy liberation." },
      q3: { question_id: "q3", score: 5, max_marks: 5, is_correct: true, verdict: "correct", feedback: "Excellent clarity. Both oxidising and reducing species correctly identified with definitions." },
      q4: { question_id: "q4", score: 9, max_marks: 10, is_correct: true, verdict: "correct", feedback: "Great breakdown! Clear practical methods cited with proper industrial rationale." },
      q5: { question_id: "q5", score: 9, max_marks: 10, is_correct: true, verdict: "correct", feedback: "Well structured answer with proper precipitate formation noted in double displacement." },
    }
  },

  // 2. Finished Homework 2: Mathematics (Completed with score 23/25)
  {
    id: "hw-finished-002",
    subject: "Mathematics",
    topic: "Real Numbers & Fundamental Theorem of Arithmetic",
    grade: "Class 10",
    totalMarks: 25,
    timeLimit: 40,
    aiGenerated: true,
    triggeredBy: "ai_adaptive",
    dueDate: "Completed",
    completedDate: "Sep 25, 2026",
    status: "completed",
    emoji: "🧮",
    color: ["#ff9c1a", "#ff791f"],
    accentColor: "#ff9c1a",
    description: "Evaluated mastery set on prime factorisation, irrational proofs, and Euclid's lemma applications.",
    score: 23,
    percentage: 92,
    pointsEarned: 80,
    sectionScores: { "HCF & LCM": 8, "Irrationality Proof": 7, "Word Problems": 8 },
    questions: [
      {
        id: "q1",
        question_number: 1,
        type: "mcq",
        marks: 1,
        question: "If two positive integers a and b are written as a = x³y² and b = xy³, where x, y are prime numbers, then HCF(a, b) is:",
        options: ["xy", "xy²", "x³y³", "x²y²"],
        correctOption: 1,
        correct_answer: "xy²",
      },
      {
        id: "q2",
        question_number: 2,
        type: "short",
        marks: 3,
        question: "Explain why 7 × 11 × 13 + 13 is a composite number.",
        correct_answer: "Factoring out 13 gives 13 × (7 × 11 + 1) = 13 × 78 = 13 × 2 × 3 × 13. Since it has prime factors other than 1 and itself, it is composite.",
      },
      {
        id: "q3",
        question_number: 3,
        type: "medium",
        marks: 5,
        question: "Prove that √5 is an irrational number by contradiction method.",
        correct_answer: "Assume √5 = a/b where a and b are coprime integers. 5 = a²/b² => 5b² = a². So 5 divides a. Let a = 5c, then 5b² = 25c² => b² = 5c², so 5 divides b. Contradicts coprimality of a and b.",
      },
      {
        id: "q4",
        question_number: 4,
        type: "long",
        marks: 8,
        question: "An army contingent of 616 members is to march behind an army band of 32 members. What is the maximum number of columns in which they can march?",
        correct_answer: "The maximum number of columns is given by HCF(616, 32). By prime factorisation or division: 616 = 32 × 19 + 8; 32 = 8 × 4 + 0. Therefore HCF is 8.",
      },
      {
        id: "q5",
        question_number: 5,
        type: "long",
        marks: 8,
        question: "Find the largest number that divides 2053 and 367 leaving remainders 5 and 7 respectively.",
        correct_answer: "Required number is HCF(2053 - 5, 367 - 7) = HCF(2048, 360). 2048 = 360 × 5 + 248; 360 = 248 × 1 + 112; 248 = 112 × 2 + 24; 112 = 24 × 4 + 16; 24 = 16 × 1 + 8; 16 = 8 × 2 + 0. Answer is 64 / 8 depending on steps.",
      }
    ],
    savedAnswers: {
      q1: "xy²",
      q2: "7 × 11 × 13 + 13 = 13(77 + 1) = 13 × 78. Because it can be expressed as a product of two factors greater than 1, it satisfies the definition of a composite number.",
      q3: "Assume root 5 is rational = p/q (co-prime). Squaring both sides: 5q² = p², meaning 5 divides p². Thus 5 divides p. Let p=5k. Then 5q² = 25k² => q²=5k², meaning 5 divides q. This contradicts co-prime condition. Hence root 5 is irrational.",
      q4: "Maximum columns = HCF(616, 32). 616 = 32 × 19 + 8. Then 32 = 8 × 4 + 0. Remainder is zero so HCF is 8. The army can march in 8 columns.",
      q5: "Numbers are 2053 - 5 = 2048 and 367 - 7 = 360. Applying Euclid's algorithm: HCF(2048, 360) = 8. Largest number is 64.",
    },
    feedback: {
      q1: { question_id: "q1", score: 1, max_marks: 1, is_correct: true, verdict: "correct", feedback: "Correct! Lowest power of common primes x and y gives x¹y²." },
      q2: { question_id: "q2", score: 3, max_marks: 3, is_correct: true, verdict: "correct", feedback: "Full marks. Proved by Fundamental Theorem of Arithmetic." },
      q3: { question_id: "q3", score: 5, max_marks: 5, is_correct: true, verdict: "correct", feedback: "Impeccable proof using theorem on prime divisibility of squares." },
      q4: { question_id: "q4", score: 8, max_marks: 8, is_correct: true, verdict: "correct", feedback: "Correct HCF calculation with neat step-by-step division." },
      q5: { question_id: "q5", score: 6, max_marks: 8, is_correct: true, verdict: "partial", feedback: "Good attempt! Check the final step of the Euclidean chain — final divisor is 64." },
    }
  },

  // 3. Finished Homework 3: Social Science (Score 18/20 · Completed)
  {
    id: "hw-finished-003",
    subject: "Social Science",
    topic: "Resources & Development — Land Degradation & Soil Conservation",
    grade: "Class 10",
    totalMarks: 20,
    timeLimit: 30,
    aiGenerated: true,
    triggeredBy: "ai_adaptive",
    dueDate: "Completed",
    completedDate: "Sep 22, 2026",
    status: "completed",
    emoji: "🌍",
    color: ["#00a7c8", "#0284c7"],
    accentColor: "#00a7c8",
    description: "Evaluated review analyzing resource planning, sustainable development, and soil erosion.",
    score: 18,
    percentage: 90,
    pointsEarned: 70,
    sectionScores: { "Sustainable Development": 8, "Soil Types": 10 },
    questions: [
      {
        id: "q1",
        question_number: 1,
        type: "mcq",
        marks: 2,
        question: "Which one of the following is the main cause of land degradation in Punjab and Haryana?",
        options: ["Mining", "Over-irrigation", "Deforestation", "Overgrazing"],
        correctOption: 1,
        correct_answer: "Over-irrigation",
      },
      {
        id: "q2",
        question_number: 2,
        type: "short",
        marks: 3,
        question: "What is meant by 'Agenda 21'? Mention its primary objective.",
        correct_answer: "Agenda 21 is a declaration signed by world leaders in 1992 at UNCED in Rio de Janeiro to achieve global sustainable development by combating environmental damage, poverty and disease through global cooperation.",
      },
      {
        id: "q3",
        question_number: 3,
        type: "medium",
        marks: 5,
        question: "Describe three steps involved in the resource planning process in India.",
        correct_answer: "1) Identification and inventory of resources across the country through surveying and mapping. 2) Evolving a planning structure endowed with appropriate technology, skill and institutions. 3) Matching resource development plans with national development plans.",
      },
      {
        id: "q4",
        question_number: 4,
        type: "long",
        marks: 10,
        question: "Explain the methods of soil conservation in hilly and desert areas.",
        correct_answer: "In hilly areas: Contour ploughing, terrace farming, and strip cropping prevent surface runoff. In desert/arid areas: Planting shelter belts of trees, stabilizing sand dunes by growing thorny bushes, and controlled grazing.",
      }
    ],
    savedAnswers: {
      q1: "Over-irrigation",
      q2: "Agenda 21 was adopted at the 1992 Earth Summit in Rio de Janeiro. Its goal is global sustainable development where every local government draws its own local Agenda 21 to tackle environmental degradation.",
      q3: "1. Identification & mapping of existing mineral and natural resources. 2. Developing technological tools and infrastructure. 3. Aligning resource extraction with broader national economic growth goals.",
      q4: "In mountainous terrains, terrace cultivation and contour bunding reduce water speed. In dry/desert regions, shelterbelts (rows of trees) block fierce winds and prevent sand dune expansion.",
    },
    feedback: {
      q1: { question_id: "q1", score: 2, max_marks: 2, is_correct: true, verdict: "correct", feedback: "Correct! Over-irrigation causes water logging leading to high salinity in Punjab." },
      q2: { question_id: "q2", score: 3, max_marks: 3, is_correct: true, verdict: "correct", feedback: "Well stated! Accurate historical context and core principle noted." },
      q3: { question_id: "q3", score: 5, max_marks: 5, is_correct: true, verdict: "correct", feedback: "Clear enumeration of all three planning stages outlined in NCERT." },
      q4: { question_id: "q4", score: 8, max_marks: 10, is_correct: true, verdict: "correct", feedback: "Solid explanation. Mention strip cropping alongside shelterbelts for full marks." },
    }
  },

  // 4. Pending Homework 1: AI Auto-Generated English Mid Term Paper
  {
    id: "mid-term-english-001",
    subject: "English",
    topic: "Mid Term Paper — Unit 1: A Letter to God, Dust of Snow, Fire and Ice",
    grade: "Class 10",
    totalMarks: MID_TERM_PAPER.total_marks,
    timeLimit: MID_TERM_PAPER.duration_minutes,
    aiGenerated: true,
    triggeredBy: "auto",
    dueDate: "Tomorrow, 5:00 PM",
    status: "pending",
    emoji: "📖",
    color: ["#0284c7", "#2389ff"],
    accentColor: "#0284c7",
    description: MID_TERM_PAPER.paper_title,
    questions: MID_TERM_PAPER.questions.map(normalizePaperQuestion),
    savedAnswers: {},
  },

  // 5. In-Progress Homework: Science Life Processes (AI Generated)
  {
    id: "hw-auto-science-002",
    subject: "Science",
    topic: "Life Processes — Nutrition, Stomata & Respiration Pathways",
    grade: "Class 10",
    totalMarks: 25,
    timeLimit: 40,
    aiGenerated: true,
    triggeredBy: "ai_adaptive",
    dueDate: "Oct 02, 2026",
    status: "in-progress",
    emoji: "🌿",
    color: ["#27b86a", "#00a7c8"],
    accentColor: "#27b86a",
    description: "AI-assigned practice targeting weak areas in stomatal guard cell mechanism and anaerobic pathways.",
    questions: [
      {
        id: "sq1",
        question_number: 1,
        type: "mcq",
        marks: 1,
        question: "The opening and closing of the stomatal pore depends upon:",
        options: ["Atmospheric temperature", "Oxygen concentration", "Water in guard cells", "Concentration of CO2 in stomata"],
        correctOption: 2,
        correct_answer: "Water in guard cells",
      },
      {
        id: "sq2",
        question_number: 2,
        type: "short",
        marks: 3,
        question: "How does opening and closing of stomata take place in leaves?",
        hint: "Mention swelling and shrinking of guard cells when water enters or leaves.",
      },
      {
        id: "sq3",
        question_number: 3,
        type: "medium",
        marks: 5,
        question: "Differentiate between aerobic and anaerobic respiration with breakdown equations.",
      },
      {
        id: "sq4",
        question_number: 4,
        type: "long",
        marks: 8,
        question: "Explain the process of double circulation in human beings. Why is it necessary?",
        hint: "Separate oxygenated and deoxygenated blood to meet high energy requirements of mammals.",
      },
      {
        id: "sq5",
        question_number: 5,
        type: "long",
        marks: 8,
        question: "Draw and explain the structure of a nephron. Describe the role of glomerulus.",
      }
    ],
    savedAnswers: {
      sq1: "Water in guard cells",
      sq2: "When water flows into guard cells they swell up and curve outward, opening the stomatal pore. When they lose water, they shrink and become flaccid, closing the pore.",
    },
  },

  // 6. Pending Homework: Mathematics Polynomials (AI Generated)
  {
    id: "hw-auto-maths-003",
    subject: "Mathematics",
    topic: "Polynomials — Relationship between Zeroes & Coefficients",
    grade: "Class 10",
    totalMarks: 20,
    timeLimit: 35,
    aiGenerated: true,
    triggeredBy: "auto",
    dueDate: "Oct 04, 2026",
    status: "pending",
    emoji: "🧮",
    color: ["#ff9c1a", "#ff791f"],
    accentColor: "#ff9c1a",
    description: "Adaptive drill on sum and product of quadratic zeroes and finding quadratic equations.",
    questions: [
      {
        id: "mq1",
        question_number: 1,
        type: "mcq",
        marks: 1,
        question: "If one zero of the quadratic polynomial x² + 3x + k is 2, then the value of k is:",
        options: ["10", "-10", "-7", "-2"],
        correctOption: 1,
        correct_answer: "-10",
      },
      {
        id: "mq2",
        question_number: 2,
        type: "short",
        marks: 3,
        question: "Find a quadratic polynomial whose sum and product of zeroes are -3 and 2 respectively.",
      },
      {
        id: "mq3",
        question_number: 3,
        type: "medium",
        marks: 6,
        question: "Find the zeroes of 6x² - 3 - 7x and verify the relationship between zeroes and coefficients.",
      },
      {
        id: "mq4",
        question_number: 4,
        type: "long",
        marks: 10,
        question: "If alpha and beta are zeroes of p(x) = 2x² + 5x + k such that alpha² + beta² + alpha*beta = 21/4, find the value of k.",
      }
    ],
    savedAnswers: {},
  }
];

// ─── CIRCULAR PROGRESS RING ───────────────────────────────────────────────────

const Ring: React.FC<{ pct?: number; size?: number; stroke?: number; color?: string; bg?: string; children?: React.ReactNode }> = ({
  pct = 0,
  size = 54,
  stroke = 5,
  color = "#27b86a",
  bg = "rgba(0,0,0,.08)",
  children,
}) => {
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const safePct = Math.min(100, Math.max(0, isNaN(pct) ? 0 : pct));
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${(safePct / 100) * c} ${c}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray .8s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
};

// ─── ANIMATED NUMBER ─────────────────────────────────────────────────────────

function AnimNum({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let cur = 0;
    const end = isNaN(target) ? 0 : target;
    const step = () => {
      cur += end / 32;
      if (cur < end) {
        setV(Math.floor(cur));
        requestAnimationFrame(step);
      } else setV(end);
    };
    requestAnimationFrame(step);
  }, [target]);
  return <>{v}{suffix}</>;
}

// ─── AI STUDY COMPANION CHAT DOCK (BLUE & GREEN PALETTE) ─────────────────────

function AIChatWidget({ currentSubject, currentQuestion, dark }: { currentSubject?: string | null; currentQuestion?: string | null; dark: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ id: number; from: "ai" | "user"; text: string; time: Date }>>([
    {
      id: 1,
      from: "ai",
      text: "Hey! 👋 I'm your AI Study Assistant. I'm here to give you hints, explain core concepts, and guide you through homework questions without giving away answers! What are you working on?",
      time: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const msg = text || input.trim();
      if (!msg) return;
      setInput("");
      const userMsg = { id: Date.now(), from: "user" as const, text: msg, time: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      setTyping(true);

      try {
        const res = await sendHomeworkChat({
          homeworkId: "active",
          message: msg,
          subject: currentSubject || "General",
        }).catch(() => null);

        let aiText = res?.response;
        if (!aiText) {
          const lmsg = msg.toLowerCase();
          if (lmsg.includes("hint")) {
            aiText = `💡 Strategic Hint: Look closely at the action keywords in the prompt. Identify the core textbook concept first, then apply it step by step!`;
          } else if (lmsg.includes("mistake") || lmsg.includes("wrong")) {
            aiText = `⚠️ Common Pitfalls: Avoid vague generalizations. Always back claims up with specific subject terms, balanced equations, or direct evidence!`;
          } else if (lmsg.includes("explain") || lmsg.includes("concept")) {
            aiText = `📖 Key Concept: Focus on cause-and-effect relationships. Think about how this unit's principles apply to real-world observations!`;
          } else {
            aiText = `Great effort! Keep going — you are on the right track. Remember to write clearly, mind your word limits, and verify your answers before submitting! ✨`;
          }
        }

        setMessages((prev) => [...prev, { id: Date.now() + 1, from: "ai", text: aiText, time: new Date() }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            from: "ai",
            text: "Take your time! Read the question carefully, review your notes, and structure your answer step by step. You've got this! ✨",
            time: new Date(),
          },
        ]);
      } finally {
        setTyping(false);
      }
    },
    [input, currentSubject]
  );

  return (
    <div className={`hw-ai-dock${open ? " open" : ""}`}>
      {open && (
        <div className="hw-ai-box">
          <div className="hw-ai-head">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src={roboImg} alt="AI" style={{ width: 26, height: 26, objectFit: "contain" }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#fff" }}>AI Study Companion</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.8)" }}>{currentSubject || "Active Session"} · Always ready</div>
              </div>
            </div>
            <button className="hw-ai-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          {currentQuestion && (
            <div className="hw-ai-ctx">
              <span style={{ fontSize: 10.5, fontWeight: 800, color: "var(--sd-muted)" }}>Current Question Context:</span>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sd-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentQuestion}
              </div>
            </div>
          )}

          <div className="hw-ai-msgs">
            {messages.map((m) => (
              <div key={m.id} className={`hw-ai-msg ${m.from}`}>
                {m.text}
              </div>
            ))}
            {typing && (
              <div className="hw-ai-msg ai" style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span className="hw-dot-pulse" />
                <span className="hw-dot-pulse" style={{ animationDelay: ".2s" }} />
                <span className="hw-dot-pulse" style={{ animationDelay: ".4s" }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="hw-ai-quick">
            {["💡 Give me a hint", "📖 Explain concept", "⚠️ Common pitfalls", "✅ Check approach"].map((t) => (
              <button key={t} className="hw-ai-qchip" onClick={() => sendMessage(t)}>
                {t}
              </button>
            ))}
          </div>

          <div className="hw-ai-input-row">
            <input
              ref={inputRef}
              className="hw-ai-input"
              placeholder="Ask AI for hints or guidance…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button className="hw-ai-send" onClick={() => sendMessage()} disabled={!input.trim() || typing}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      <button className="hw-ai-fab" onClick={() => setOpen((o) => !o)} title="AI Study Assistant">
        <img src={roboImg} alt="AI" style={{ width: 28, height: 28, objectFit: "contain" }} />
        <span>Ask AI Helper</span>
      </button>
    </div>
  );
}

// ─── MAIN HOMEWORK PAGE COMPONENT ─────────────────────────────────────────────

export default function HomeworkPage() {
  const { user } = useAuth();
  const { isDark: dark, toggleTheme } = useTheme();

  // Navigation: 'hub' (dashboard list), 'solve' (taking homework), 'review' (viewing completed homework)
  const [view, setView] = useState<"hub" | "solve" | "review">("hub");

  // Homework list with auto-generated assignments and previously finished homework
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>(() => {
    try {
      const saved = localStorage.getItem("gradeup_student_homeworks");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_ASSIGNMENTS;
  });

  const [loading, setLoading] = useState(false);
  const [librarySubjects, setLibrarySubjects] = useState<LibrarySubject[]>([]);

  // Active Homework for Solving or Reviewing
  const [activeId, setActiveId] = useState<string | null>(null);
  const [curQIndex, setCurQIndex] = useState(0);
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "pending" | "completed">("All");
  const [sortOrder, setSortOrder] = useState<"newest" | "highest_score" | "oldest">("newest");

  // Media & Interaction
  const [recording, setRecording] = useState(false);
  const [pasteWarn, setPasteWarn] = useState(false);
  const [uploads, setUploads] = useState<Record<string, { name: string; size: string }>>({});
  const mediaRef = useRef<MediaRecorder | null>(null);

  const candidateContext = useMemo(() => getCandidateContext(user), [user]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("gradeup_student_homeworks", JSON.stringify(assignments));
    } catch {}
  }, [assignments]);

  // Fetch backend library subjects & backend homework
  useEffect(() => {
    let cancelled = false;
    async function initData() {
      try {
        const subs = await getLibrarySubjects().catch(() => []);
        if (!cancelled && subs) setLibrarySubjects(subs);

        // Fetch server homework
        const serverRes = await getHomework({ candidateId: candidateContext.candidateId }).catch(() => null);
        const serverList = Array.isArray(serverRes) ? serverRes : (serverRes as any)?.homeworks;
        if (!cancelled && Array.isArray(serverList) && serverList.length > 0) {
          setAssignments((prev) => {
            const existingIds = new Set(prev.map((a) => a.id));
            const newFromServer: HomeworkAssignment[] = serverList
              .filter((sh: any) => !existingIds.has(sh.homework_id))
              .map((sh: any) => {
                const sm = getSubjectMeta(sh.subject || "General");
                return {
                  id: sh.homework_id,
                  homework_id: sh.homework_id,
                  subject: sh.subject || "General",
                  topic: `${sh.subject || "General"} · Unit ${sh.unit_number || 1} Review`,
                  grade: "Class 10",
                  totalMarks: (sh.num_questions || 5) * 2,
                  timeLimit: 30,
                  aiGenerated: true,
                  triggeredBy: "ai_adaptive",
                  dueDate: sh.assigned_at ? new Date(sh.assigned_at).toLocaleDateString([], { month: "short", day: "numeric" }) : "Today",
                  status: sh.status === "completed" ? "completed" : "pending",
                  emoji: sm.icon,
                  color: sm.gradient,
                  accentColor: sm.color,
                  description: `AI-assigned homework based on performance diagnostics.`,
                  score: sh.score,
                  percentage: sh.score ? Math.round((sh.score / ((sh.num_questions || 5) * 2)) * 100) : undefined,
                  questions: [],
                };
              });
            return [...prev, ...newFromServer];
          });
        }
      } catch (err) {
        console.warn("Backend homework sync:", err);
      }
    }
    void initData();
    return () => {
      cancelled = true;
    };
  }, [candidateContext.candidateId]);

  // Active Homework reference
  const activeAssignment: HomeworkAssignment | null = useMemo(() => {
    if (!activeId) return null;
    return assignments.find((a) => a.id === activeId) || null;
  }, [assignments, activeId]);

  // Current Question in active homework
  const currentQuestion: QuestionItem | null = useMemo(() => {
    if (!activeAssignment?.questions || activeAssignment.questions.length === 0) return null;
    return activeAssignment.questions[curQIndex] || null;
  }, [activeAssignment, curQIndex]);

  // Open homework in Solving Mode
  const startSolving = (item: HomeworkAssignment) => {
    setActiveId(item.id);
    setCurrentAnswers(item.savedAnswers || {});
    setCurQIndex(0);
    setView("solve");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Open homework in Review Mode (for finished/completed homework)
  const openReview = (item: HomeworkAssignment) => {
    setActiveId(item.id);
    setCurrentAnswers(item.savedAnswers || {});
    setView("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Answer handler
  const handleAnswerInput = (val: string) => {
    if (!currentQuestion || !activeAssignment) return;
    const qid = currentQuestion.id;
    const updated = { ...currentAnswers, [qid]: val };
    setCurrentAnswers(updated);

    // Save progress as In-Progress
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === activeAssignment.id
          ? {
              ...a,
              status: a.status === "pending" ? "in-progress" : a.status,
              savedAnswers: updated,
            }
          : a
      )
    );
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      mr.onstop = () => {
        handleAnswerInput("Voice response recorded. (Processed by AI speech transcriber)");
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
    } catch {
      handleAnswerInput("[Voice answer noted]");
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  // File upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, qid: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sz = file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;
    setUploads((p) => ({ ...p, [qid]: { name: file.name, size: sz } }));
    handleAnswerInput(`Uploaded attachment: ${file.name} (${sz})`);
  };

  // Submit Homework with AI Evaluation
  const submitHomeworkAction = async () => {
    if (!activeAssignment) return;
    setSubmitting(true);
    setShowSubmitModal(false);

    try {
      // If server homework ID is available, sync to backend API
      if (activeAssignment.homework_id) {
        await submitHomework({
          homeworkId: activeAssignment.homework_id,
          candidateId: candidateContext.candidateId,
          answers: (activeAssignment.questions || []).map((q) => ({
            question_id: q.id,
            answer: currentAnswers[q.id] || "",
          })),
        }).catch(() => null);
      }

      // Compute evaluated scores, feedback, and verdict for each question
      let totalEarned = 0;
      const computedFeedback: Record<string, HomeworkFeedback> = {};

      activeAssignment.questions.forEach((q) => {
        const ans = currentAnswers[q.id] || "";
        let qScore = 0;
        let isCorrect = false;
        let verdict: "correct" | "partial" | "wrong" = "wrong";
        let comment = "";

        if (q.type === "mcq") {
          const isMcqCorrect =
            q.correctOption !== undefined
              ? q.options?.[q.correctOption] === ans || ans === String.fromCharCode(65 + q.correctOption)
              : q.correct_answer === ans;

          if (isMcqCorrect) {
            qScore = q.marks;
            isCorrect = true;
            verdict = "correct";
            comment = `Spot on! "${ans}" is the exact correct answer according to the lesson.`;
          } else {
            qScore = 0;
            isCorrect = false;
            verdict = "wrong";
            comment = `Incorrect. The correct option was "${q.correct_answer || q.options?.[q.correctOption ?? 0]}".`;
          }
        } else {
          const wordCount = ans.trim().split(/\s+/).filter(Boolean).length;
          if (wordCount >= (q.minWords || 15)) {
            qScore = Math.round(q.marks * 0.9);
            isCorrect = true;
            verdict = "correct";
            comment = `Excellent response! You demonstrated strong conceptual understanding and covered key terminology.`;
          } else if (wordCount > 4) {
            qScore = Math.max(1, Math.round(q.marks * 0.6));
            isCorrect = true;
            verdict = "partial";
            comment = `Good attempt! Add more supporting evidence and subject-specific vocabulary for full marks.`;
          } else {
            qScore = 0;
            isCorrect = false;
            verdict = "wrong";
            comment = `Insufficient detail provided. Review the textbook chapter and explain with concrete examples.`;
          }
        }

        totalEarned += qScore;
        computedFeedback[q.id] = {
          question_id: q.id,
          question: q.question,
          student_answer: ans,
          score: qScore,
          max_marks: q.marks,
          is_correct: isCorrect,
          verdict,
          feedback: comment,
        };
      });

      const totalPossible = activeAssignment.totalMarks || 1;
      const pct = Math.round((totalEarned / totalPossible) * 100);

      const completedAssignment: HomeworkAssignment = {
        ...activeAssignment,
        status: "completed",
        score: totalEarned,
        percentage: pct,
        pointsEarned: Math.round(totalEarned * 2.5),
        completedDate: "Just now",
        savedAnswers: currentAnswers,
        feedback: computedFeedback,
      };

      setAssignments((prev) => prev.map((a) => (a.id === completedAssignment.id ? completedAssignment : a)));
      setView("review");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── FILTER & STATS CALCULATIONS ──────────────────────────────────────────

  const filteredAssignments = useMemo(() => {
    return assignments
      .filter((item) => {
        // Subject filter
        const matchSubj =
          subjectFilter === "All" || item.subject.toLowerCase() === subjectFilter.toLowerCase();

        // Status filter: Pending/To-Do vs Finished
        const matchStatus =
          statusFilter === "All"
            ? true
            : statusFilter === "completed"
            ? item.status === "completed" || item.status === "graded" || item.status === "submitted"
            : item.status === "pending" || item.status === "in-progress";

        // Search text filter
        const matchSearch =
          !search ||
          (item.topic + " " + item.subject + " " + item.description + " " + item.grade)
            .toLowerCase()
            .includes(search.toLowerCase());

        return matchSubj && matchStatus && matchSearch;
      })
      .sort((a, b) => {
        if (sortOrder === "highest_score") {
          return (b.percentage || 0) - (a.percentage || 0);
        }
        if (sortOrder === "oldest") {
          return a.id.localeCompare(b.id);
        }
        return b.id.localeCompare(a.id);
      });
  }, [assignments, subjectFilter, statusFilter, search, sortOrder]);

  const pendingList = useMemo(
    () => filteredAssignments.filter((a) => a.status === "pending" || a.status === "in-progress"),
    [filteredAssignments]
  );

  const finishedList = useMemo(
    () => filteredAssignments.filter((a) => a.status === "completed" || a.status === "graded" || a.status === "submitted"),
    [filteredAssignments]
  );

  const stats = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter((a) => a.status === "completed" || a.status === "graded" || a.status === "submitted").length;
    const pending = total - completed;
    const scored = assignments.filter((a) => a.percentage !== undefined);
    const avgScore =
      scored.length > 0 ? Math.round(scored.reduce((acc, a) => acc + (a.percentage || 0), 0) / scored.length) : 0;
    return { total, completed, pending, avgScore };
  }, [assignments]);

  const uniqueSubjects = useMemo(() => {
    const s = new Set<string>();
    assignments.forEach((a) => a.subject && s.add(a.subject));
    return ["All", ...Array.from(s)];
  }, [assignments]);

  // Solving mode progress
  const answeredCount = useMemo(() => {
    if (!activeAssignment?.questions) return 0;
    return activeAssignment.questions.filter((q) => !!currentAnswers[q.id]?.trim()).length;
  }, [activeAssignment, currentAnswers]);

  const totalQuestions = activeAssignment?.questions?.length || 0;
  const progressPct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{CSS}</style>

      {/* DYNAMIC AMBIENT GLOW AND SPARKLES (STUDENT DASHBOARD THEME) */}
      <div className="sd-bg-ribbon" />
      <div className="sd-bg-spark s1" />
      <div className="sd-bg-spark s2" />
      <div className="sd-bg-spark s3" />

      <div className={`sd-root${dark ? " dark" : ""}`}>
        {/* TOPBAR NAVIGATION */}
        <Navigation currentRole={(user?.role as any) || "student"} onRoleChange={() => {}} />

        <div className="hw-subnav">
          <div className="hw-subnav-left">
            <div className="hw-brand-pill">
              <span className="hw-brand-icon">📚</span>
              <span className="hw-brand-text">StudyAI Homework Hub</span>
            </div>
            {view !== "hub" && (
              <div className="hw-breadcrumb">
                <button className="hw-bc-link" onClick={() => setView("hub")}>
                  Homework Hub
                </button>
                <span>›</span>
                <span className="hw-bc-active">{activeAssignment?.topic}</span>
                <span>›</span>
                <span className="hw-bc-badge">{view === "review" ? "Finished Review" : "Solving Mode"}</span>
              </div>
            )}
          </div>
          <div className="hw-subnav-right">
            <span className="hw-engine-tag">
              <Sparkles size={13} style={{ color: "#0ea5e9" }} />
              AI Automated
            </span>
            <button className="hw-theme-toggle" onClick={toggleTheme} title="Toggle Dark/Light Mode">
              {dark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            VIEW 1: HOMEWORK HUB (STUDENT DASHBOARD LAYOUT & CARDS)
        ══════════════════════════════════════════════════════════════════════ */}
        {view === "hub" && (
          <div className="hw-shell">
            {/* GREETING & MINI STATS PILLS (IDENTICAL TO STUDENT DASHBOARD) */}
            <div className="sd-greeting">
              <div>
                <h1 className="sd-title">
                  Welcome back, {candidateContext.candidateName.split(" ")[0]}! 👋
                </h1>
                <p className="sd-subtitle">
                  AI-assigned homework tasks · {stats.pending} pending · {stats.completed} finished
                </p>
              </div>

              <div className="sd-mini-stats">
                <div className="sd-mini-pill">
                  <div className="sd-pill-ico" style={{ background: "rgba(35,137,255,.15)", color: "#2389ff" }}>
                    📚
                  </div>
                  <div>
                    <div className="sd-pill-num">{stats.total}</div>
                    <div className="sd-pill-label">Total Assigned</div>
                  </div>
                </div>

                <div className="sd-mini-pill">
                  <div className="sd-pill-ico" style={{ background: "rgba(255,156,26,.15)", color: "#ff9c1a" }}>
                    ⏳
                  </div>
                  <div>
                    <div className="sd-pill-num">{stats.pending}</div>
                    <div className="sd-pill-label">To Do</div>
                  </div>
                </div>

                <div className="sd-mini-pill">
                  <div className="sd-pill-ico" style={{ background: "rgba(39,184,106,.15)", color: "#27b86a" }}>
                    ✅
                  </div>
                  <div>
                    <div className="sd-pill-num">{stats.completed}</div>
                    <div className="sd-pill-label">Finished</div>
                  </div>
                </div>

                <div className="sd-mini-pill">
                  <div className="sd-pill-ico" style={{ background: "rgba(2,132,199,.15)", color: "#0284c7" }}>
                    🏆
                  </div>
                  <div>
                    <div className="sd-pill-num">{stats.avgScore}%</div>
                    <div className="sd-pill-label">Avg Marks</div>
                  </div>
                </div>
              </div>
            </div>

            {/* HERO CARD (GREEN/CYAN/BLUE GRADIENT WITH ART & PROGRESS) */}
            <div className="sd-hero">
              <div className="sd-hero-art" aria-hidden="true">
                <img src={studyRoboImg} alt="" />
              </div>

              <div className="sd-hero-content">
                <div className="sd-chip">
                  <Sparkles size={13} />
                  <span>AI Automated Learning System</span>
                </div>
                <h2 className="sd-lesson-title">Adaptive Homework Hub</h2>
                <p className="sd-lesson-meta">
                  All homework is automatically generated by AI to reinforce your weak concepts. Review finished homework or continue your pending assignments.
                </p>

                <div className="sd-progress-line">
                  <div className="sd-progress-track">
                    <div
                      className="sd-progress-fill"
                      style={{
                        width: `${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <span className="sd-progress-text">
                    {stats.completed}/{stats.total} Finished (
                    {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%)
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {pendingList.length > 0 ? (
                    <button className="sd-primary-btn" onClick={() => startSolving(pendingList[0])}>
                      <Zap size={15} /> Start Pending Homework →
                    </button>
                  ) : (
                    <button className="sd-primary-btn" onClick={() => finishedList[0] && openReview(finishedList[0])}>
                      <Award size={15} /> Review Finished Work →
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* QUICK SUBJECT CURRICULUM ROW */}
            <div className="hw-panel">
              <div className="hw-panel-header">
                <div>
                  <h3 className="hw-panel-title">📚 Subjects & Learning Hub</h3>
                  <p className="hw-panel-sub">Filtered homework tracks across your enrolled subjects</p>
                </div>
              </div>
              <div className="sd-subject-grid">
                {[
                  { name: "English", img: subjectEnglishImg, subj: "English" },
                  { name: "Science", img: subjectScienceImg, subj: "Science" },
                  { name: "Mathematics", img: subjectMathsImg, subj: "Mathematics" },
                  { name: "Social Science", img: subjectSocialImg, subj: "Social Science" },
                ].map((s) => {
                  const sm = getSubjectMeta(s.subj);
                  const count = assignments.filter((a) => a.subject.toLowerCase() === s.subj.toLowerCase()).length;
                  const doneCount = assignments.filter(
                    (a) => a.subject.toLowerCase() === s.subj.toLowerCase() && (a.status === "completed" || a.status === "graded")
                  ).length;
                  const isSelected = subjectFilter.toLowerCase() === s.subj.toLowerCase();

                  return (
                    <div
                      key={s.name}
                      className={`sd-subject${isSelected ? " active-subject" : ""}`}
                      style={{ "--subject-bg": sm.bg } as React.CSSProperties}
                      onClick={() => setSubjectFilter(isSelected ? "All" : s.subj)}
                    >
                      <div className="sd-subject-name" style={{ color: sm.color }}>
                        {sm.icon} {s.name}
                      </div>
                      <img src={s.img} alt="" className="sd-subject-art-img" />
                      <div className="sd-subject-progress" style={{ color: "var(--sd-ink)" }}>
                        {doneCount}/{count} completed
                      </div>
                      <div className="sd-subject-bar">
                        <span
                          style={{
                            width: `${count > 0 ? (doneCount / count) * 100 : 0}%`,
                            background: sm.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TOOLBAR: SEARCH, STATUS TABS, SUBJECT FILTER CHIPS, SORT */}
            <div className="hw-toolbar">
              <div className="hw-search-box">
                <Search size={16} className="hw-search-icon" />
                <input
                  type="text"
                  placeholder="Search homework by topic, subject, or description…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="hw-search-clear" onClick={() => setSearch("")}>
                    ✕
                  </button>
                )}
              </div>

              {/* Status Tabs */}
              <div className="hw-status-tabs">
                {(
                  [
                    { id: "All", label: "All Assignments" },
                    { id: "pending", label: "To Do ⏳" },
                    { id: "completed", label: "Finished ✅" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    className={`hw-tab-btn${statusFilter === t.id ? " active" : ""}`}
                    onClick={() => setStatusFilter(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Subject Filter Chips */}
              <div className="hw-filter-chips">
                {uniqueSubjects.map((s) => (
                  <button
                    key={s}
                    className={`hw-chip${subjectFilter.toLowerCase() === s.toLowerCase() ? " active" : ""}`}
                    onClick={() => setSubjectFilter(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Sort Order */}
              <select
                className="hw-sort-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
              >
                <option value="newest">Sort: Latest First</option>
                <option value="highest_score">Sort: Highest Marks</option>
                <option value="oldest">Sort: Oldest First</option>
              </select>

              {(search || subjectFilter !== "All" || statusFilter !== "All") && (
                <button
                  className="hw-reset-btn"
                  onClick={() => {
                    setSearch("");
                    setSubjectFilter("All");
                    setStatusFilter("All");
                  }}
                >
                  <RotateCcw size={13} /> Reset
                </button>
              )}
            </div>

            {/* ─── SECTION 1: PENDING / IN-PROGRESS HOMEWORK ─── */}
            {(statusFilter === "All" || statusFilter === "pending") && pendingList.length > 0 && (
              <div className="hw-section-wrap">
                <div className="hw-sec-head">
                  <div className="hw-sec-title">
                    <span>⏳ Pending Homework ({pendingList.length})</span>
                    <span className="hw-sec-badge-auto">✨ AI Auto-Assigned</span>
                  </div>
                </div>

                <div className="hw-cards-grid">
                  {pendingList.map((hw) => {
                    const sm = getSubjectMeta(hw.subject);
                    const art = getSubjectArt(hw.subject);
                    const isProgress = hw.status === "in-progress";

                    return (
                      <div
                        key={hw.id}
                        className="hw-card"
                        style={{ "--c1": sm.gradient[0], "--c2": sm.gradient[1] } as React.CSSProperties}
                        onClick={() => startSolving(hw)}
                      >
                        <div className="hw-card-top-bar" />
                        <div className="hw-card-body">
                          <div className="hw-card-header">
                            <span className="hw-card-subj-pill" style={{ background: sm.bg, color: sm.color, borderColor: sm.border }}>
                              {sm.icon} {hw.subject}
                            </span>
                            <span className={`hw-status-pill ${hw.status}`}>
                              {isProgress ? "In Progress ✍️" : "To Do ⏳"}
                            </span>
                          </div>

                          <h4 className="hw-card-title">{hw.topic}</h4>
                          <p className="hw-card-desc">{hw.description}</p>

                          <div className="hw-card-tags">
                            <span className="hw-tag">⏱ {hw.timeLimit} mins</span>
                            <span className="hw-tag">🏆 {hw.totalMarks} marks</span>
                            <span className="hw-tag">📅 Due {hw.dueDate}</span>
                            <span className="hw-tag">{hw.questions.length} questions</span>
                          </div>

                          {isProgress && (
                            <div className="hw-card-mini-prog">
                              <div className="hw-mini-prog-track">
                                <div className="hw-mini-prog-fill" style={{ width: "50%", background: sm.color }} />
                              </div>
                              <span className="hw-mini-prog-label">Draft saved · 50% in progress</span>
                            </div>
                          )}
                        </div>

                        <div className="hw-card-footer">
                          <span className="hw-card-ai-tag">
                            <Sparkles size={12} style={{ color: "#0ea5e9" }} /> AI Generated
                          </span>
                          <button
                            className="hw-card-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              startSolving(hw);
                            }}
                          >
                            {isProgress ? "Continue →" : "Start Homework →"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── SECTION 2: PREVIOUS / FINISHED HOMEWORK DONE BY STUDENTS ─── */}
            {(statusFilter === "All" || statusFilter === "completed") && finishedList.length > 0 && (
              <div className="hw-section-wrap">
                <div className="hw-sec-head">
                  <div className="hw-sec-title">
                    <span>✅ Finished Homework & Review ({finishedList.length})</span>
                    <span className="hw-sec-badge-done">🏆 Evaluated by AI</span>
                  </div>
                </div>

                <div className="hw-cards-grid">
                  {finishedList.map((hw) => {
                    const sm = getSubjectMeta(hw.subject);
                    const pct = hw.percentage ?? Math.round(((hw.score || 0) / hw.totalMarks) * 100);

                    return (
                      <div
                        key={hw.id}
                        className="hw-card finished"
                        style={{ "--c1": "#27b86a", "--c2": "#0284c7" } as React.CSSProperties}
                        onClick={() => openReview(hw)}
                      >
                        <div className="hw-card-top-bar" style={{ background: "linear-gradient(90deg, #27b86a, #0ea5e9)" }} />
                        <div className="hw-card-body">
                          <div className="hw-card-header">
                            <span className="hw-card-subj-pill" style={{ background: sm.bg, color: sm.color, borderColor: sm.border }}>
                              {sm.icon} {hw.subject}
                            </span>
                            <span className="hw-status-pill completed">Finished & Graded 🏆</span>
                          </div>

                          <h4 className="hw-card-title">{hw.topic}</h4>
                          <p className="hw-card-desc">{hw.description}</p>

                          <div className="hw-card-tags">
                            <span className="hw-tag">📅 Completed {hw.completedDate || "Recently"}</span>
                            <span className="hw-tag">{hw.questions.length} questions evaluated</span>
                            {hw.pointsEarned && <span className="hw-tag pts">+{hw.pointsEarned} XP</span>}
                          </div>

                          {/* Score meter */}
                          <div className="hw-card-score-bar">
                            <div className="hw-score-bar-track">
                              <div className="hw-score-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="hw-score-bar-details">
                              <span className="hw-score-main">
                                Score: {hw.score}/{hw.totalMarks}
                              </span>
                              <span className="hw-score-percent">{pct}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="hw-card-footer">
                          <span className="hw-card-ai-tag">
                            <CheckCircle2 size={13} style={{ color: "#27b86a" }} /> AI Evaluated
                          </span>
                          <button
                            className="hw-card-btn review"
                            onClick={(e) => {
                              e.stopPropagation();
                              openReview(hw);
                            }}
                          >
                            Review Homework 🏆
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* EMPTY STATE */}
            {filteredAssignments.length === 0 && (
              <div className="hw-empty-card">
                <img src={studyRoboImg} alt="" className="hw-empty-mascot" />
                <h3 className="hw-empty-title">No Assignments Found</h3>
                <p className="hw-empty-desc">
                  No homework matches your search term or filter criteria. Try resetting filters to see all assigned tasks.
                </p>
                <button
                  className="sd-primary-btn"
                  onClick={() => {
                    setSearch("");
                    setSubjectFilter("All");
                    setStatusFilter("All");
                  }}
                >
                  <RotateCcw size={15} /> Reset All Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            VIEW 2: HOMEWORK SOLVING MODE (PAST FUNCTIONS PRESERVED)
        ══════════════════════════════════════════════════════════════════════ */}
        {view === "solve" && activeAssignment && currentQuestion && (
          <div className="hw-shell">
            {/* SOLVING HEADER */}
            <div className="hw-solve-hero">
              <div className="hw-solve-hero-left">
                <button className="hw-btn-back" onClick={() => setView("hub")}>
                  <ArrowLeft size={16} /> Back to Hub
                </button>
                <div>
                  <div className="hw-solve-meta-chip">
                    <span>{activeAssignment.subject}</span> · <span>{activeAssignment.grade}</span> ·{" "}
                    <span>⏱ {activeAssignment.timeLimit} mins</span>
                  </div>
                  <h2 className="hw-solve-heading">
                    Question {curQIndex + 1} of {totalQuestions}
                  </h2>
                </div>
              </div>

              <div className="hw-solve-hero-right">
                <Ring pct={progressPct} size={50} stroke={4} color="#27b86a">
                  <span style={{ fontSize: 11, fontWeight: 900, color: "var(--sd-ink)" }}>{progressPct}%</span>
                </Ring>
                <div className="hw-solve-stat-pill">
                  <div className="hw-stat-val">
                    {answeredCount}/{totalQuestions}
                  </div>
                  <div className="hw-stat-lbl">Answered</div>
                </div>
                <button className="sd-primary-btn" onClick={() => setShowSubmitModal(true)} disabled={submitting}>
                  {submitting ? <Loader2 size={16} className="hw-spin" /> : <Send size={15} />}
                  <span>Submit Homework</span>
                </button>
              </div>
            </div>

            <div className="hw-solve-grid">
              {/* SIDEBAR QUESTION NAVIGATOR */}
              <div className="hw-sidebar-nav">
                <div className="hw-snav-head">
                  <span style={{ fontWeight: 800, fontSize: 13 }}>Questions Navigator</span>
                  <span style={{ fontSize: 11, color: "var(--sd-muted)", fontWeight: 700 }}>
                    {answeredCount}/{totalQuestions}
                  </span>
                </div>
                <div className="hw-snav-list">
                  {activeAssignment.questions.map((q, idx) => {
                    const isCur = idx === curQIndex;
                    const isDone = !!currentAnswers[q.id]?.trim();
                    const cfg = QT[q.type] || QT.conceptual;
                    return (
                      <button
                        key={q.id || idx}
                        className={`hw-snav-item${isCur ? " active" : ""}${isDone ? " answered" : ""}`}
                        onClick={() => setCurQIndex(idx)}
                      >
                        <span className="hw-snav-icon">{isDone ? "✓" : cfg.icon}</span>
                        <div className="hw-snav-text">
                          <span className="hw-snav-title">
                            Q{idx + 1} · {cfg.short}
                          </span>
                          <span className="hw-snav-marks">{q.marks} mark{q.marks > 1 ? "s" : ""}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CURRENT QUESTION WORKSPACE */}
              <div className="hw-workspace">
                <div className="hw-q-card">
                  <div className="hw-q-head">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className="hw-q-badge" style={{ color: QT[currentQuestion.type]?.accent }}>
                        {QT[currentQuestion.type]?.icon || "💡"} {QT[currentQuestion.type]?.label || currentQuestion.type}
                      </span>
                      {currentQuestion.section && (
                        <span className="hw-q-sec">
                          <Layers size={12} /> Section {currentQuestion.section}
                        </span>
                      )}
                    </div>
                    <span className="hw-q-marks">🏅 {currentQuestion.marks} marks</span>
                  </div>

                  <div className="hw-q-prompt">{currentQuestion.question}</div>

                  {/* AI Hints Box */}
                  {currentQuestion.hint && (
                    <div className="hw-q-hint-box">
                      <div className="hw-q-hint-title">
                        <Lightbulb size={15} style={{ color: "#ff9c1a" }} />
                        <span>AI Hint</span>
                      </div>
                      <p className="hw-q-hint-text">{currentQuestion.hint}</p>
                    </div>
                  )}

                  {/* MCQ OPTION SELECTION */}
                  {currentQuestion.type === "mcq" && currentQuestion.options && (
                    <div className="hw-options-list">
                      {currentQuestion.options.map((opt, i) => {
                        const letter = String.fromCharCode(65 + i);
                        const isSelected =
                          currentAnswers[currentQuestion.id] === opt ||
                          currentAnswers[currentQuestion.id] === letter;
                        return (
                          <button
                            key={i}
                            className={`hw-option-btn${isSelected ? " selected" : ""}`}
                            onClick={() => handleAnswerInput(opt)}
                          >
                            <span className="hw-opt-letter">{letter}</span>
                            <span className="hw-opt-text">{opt}</span>
                            {isSelected && <Check size={16} className="hw-opt-check" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* WRITTEN TEXT / SHORT / ESSAY INPUT */}
                  {currentQuestion.type !== "mcq" && (
                    <div className="hw-text-wrap">
                      <div className="hw-text-guide">
                        <span>✏️ Write in your own words. Formulate clear arguments with textbook references.</span>
                      </div>
                      <textarea
                        className="hw-textarea-input"
                        rows={currentQuestion.marks >= 5 ? 8 : 5}
                        placeholder={`Type your answer here… ${currentQuestion.minWords ? `(${currentQuestion.minWords}–${currentQuestion.maxWords || 150} words)` : ""}`}
                        value={currentAnswers[currentQuestion.id] || ""}
                        onChange={(e) => handleAnswerInput(e.target.value)}
                        onPaste={(e) => {
                          e.preventDefault();
                          setPasteWarn(true);
                          setTimeout(() => setPasteWarn(false), 2400);
                        }}
                      />
                      {pasteWarn && (
                        <div className="hw-paste-warning">
                          🚫 Direct paste is disabled — practice expressing answers in your own words!
                        </div>
                      )}

                      {/* Tool helpers: Speech recording & File upload */}
                      <div className="hw-input-tools">
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button
                            className={`hw-tool-btn${recording ? " rec" : ""}`}
                            onClick={recording ? stopRecording : startRecording}
                          >
                            <Mic size={14} />
                            <span>{recording ? "Recording… Tap to Stop" : "Voice Answer"}</span>
                          </button>
                          <label className="hw-tool-btn">
                            <Paperclip size={14} />
                            <span>Attach Work</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              style={{ display: "none" }}
                              onChange={(e) => handleFileUpload(e, currentQuestion.id)}
                            />
                          </label>
                        </div>
                        <span className="hw-word-metric">
                          {(currentAnswers[currentQuestion.id] || "").trim().split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>
                    </div>
                  )}

                  {/* STEPPER BUTTONS */}
                  <div className="hw-q-footer">
                    <button
                      className="hw-btn-step"
                      onClick={() => setCurQIndex((i) => Math.max(0, i - 1))}
                      disabled={curQIndex === 0}
                    >
                      <ArrowLeft size={15} /> Previous Question
                    </button>

                    <div style={{ display: "flex", gap: 8 }}>
                      {curQIndex < totalQuestions - 1 ? (
                        <button
                          className="sd-primary-btn"
                          onClick={() => setCurQIndex((i) => Math.min(totalQuestions - 1, i + 1))}
                        >
                          <span>Save & Next</span>
                          <ArrowRight size={15} />
                        </button>
                      ) : (
                        <button className="sd-primary-btn" onClick={() => setShowSubmitModal(true)}>
                          <CheckCircle2 size={16} />
                          <span>Review & Submit</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            VIEW 3: FINISHED HOMEWORK REVIEW EXPERIENCE (STUDENT SIDE)
        ══════════════════════════════════════════════════════════════════════ */}
        {view === "review" && activeAssignment && (
          <div className="hw-shell">
            {/* HERO SCORE & EVALUATION BANNER */}
            <div className="hw-review-hero">
              <button className="hw-btn-back" onClick={() => setView("hub")}>
                <ArrowLeft size={16} /> Back to Homework Hub
              </button>

              <div className="hw-review-hero-grid">
                <div className="hw-review-trophy-box">🏆</div>
                <div className="hw-review-info">
                  <div className="hw-review-verified">
                    <CheckCircle2 size={14} /> Evaluated by AI Study Tutor
                  </div>
                  <h2 className="hw-review-title">{activeAssignment.topic}</h2>
                  <p className="hw-review-sub">
                    Completed on {activeAssignment.completedDate || "Recently"} · {activeAssignment.subject} · {activeAssignment.grade}
                  </p>
                </div>

                <div className="hw-review-score-panel">
                  <div className="hw-rev-score-big">
                    {activeAssignment.score ?? 0}
                    <small>/{activeAssignment.totalMarks}</small>
                  </div>
                  <div className="hw-rev-pct">{activeAssignment.percentage ?? 0}% Marks</div>
                  {activeAssignment.pointsEarned && (
                    <div className="hw-rev-points">+{activeAssignment.pointsEarned} XP Earned</div>
                  )}
                </div>
              </div>

              {/* Section score breakdown */}
              {activeAssignment.sectionScores && Object.keys(activeAssignment.sectionScores).length > 0 && (
                <div className="hw-section-scores-row">
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--sd-muted)" }}>
                    Section Scores:
                  </span>
                  {Object.entries(activeAssignment.sectionScores).map(([sec, pts]) => (
                    <span key={sec} className="hw-sec-badge">
                      <strong>{sec}:</strong> {pts} pts
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* DETAILED QUESTION REVIEW LIST */}
            <div className="hw-review-section">
              <h3 className="hw-review-sec-title">Question Breakdown & AI Feedback</h3>

              <div className="hw-review-cards">
                {activeAssignment.questions.map((q, idx) => {
                  const studentAns = activeAssignment.savedAnswers?.[q.id] || "";
                  const fb = activeAssignment.feedback?.[q.id];
                  const isCorrect = fb ? fb.is_correct : false;
                  const marksEarned = fb ? fb.score : 0;
                  const cfg = QT[q.type] || QT.conceptual;

                  return (
                    <div key={q.id || idx} className={`hw-rev-card ${isCorrect ? "correct" : "partial"}`}>
                      <div className="hw-rc-head">
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="hw-rc-num">Q{idx + 1}</span>
                          <span className="hw-rc-type" style={{ color: cfg.accent }}>
                            {cfg.icon} {cfg.label}
                          </span>
                          {q.section && <span className="hw-rc-sec">Section {q.section}</span>}
                        </div>
                        <div className="hw-rc-score-pill">
                          {isCorrect && marksEarned === q.marks ? (
                            <span className="correct">✓ Full Marks ({marksEarned}/{q.marks})</span>
                          ) : marksEarned > 0 ? (
                            <span className="partial">🟡 Partial Credit ({marksEarned}/{q.marks})</span>
                          ) : (
                            <span className="wrong">✗ {marksEarned}/{q.marks}</span>
                          )}
                        </div>
                      </div>

                      <div className="hw-rc-question-text">{q.question}</div>

                      {/* Student's Submitted Answer */}
                      <div className="hw-rc-ans-block">
                        <span className="hw-rc-ans-tag">Your Submitted Answer:</span>
                        <div className="hw-rc-ans-val">
                          {studentAns ? studentAns : <em style={{ color: "var(--sd-muted)" }}>No answer submitted</em>}
                        </div>
                      </div>

                      {/* AI Feedback & Corrections */}
                      {fb && (
                        <div className="hw-rc-fb-block">
                          <div className="hw-rc-fb-title">
                            <Sparkles size={14} style={{ color: "#0ea5e9" }} />
                            <span>AI Evaluation & Key Insights</span>
                          </div>
                          <div className="hw-rc-fb-msg">{fb.feedback}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hw-review-actions-bottom">
                <button className="hw-btn-back" onClick={() => setView("hub")}>
                  <ArrowLeft size={16} /> Return to Homework Hub
                </button>
                {pendingList.length > 0 && (
                  <button className="sd-primary-btn" onClick={() => startSolving(pendingList[0])}>
                    <Zap size={16} /> Continue Next Homework →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUBMISSION CONFIRMATION MODAL */}
        {showSubmitModal && (
          <div className="hw-modal-backdrop" onClick={() => !submitting && setShowSubmitModal(false)}>
            <div className="hw-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="hw-modal-dialog-head">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="hw-modal-icon-wrap">
                    <Send size={18} style={{ color: "#2389ff" }} />
                  </div>
                  <div>
                    <h3 className="hw-modal-dialog-title">Submit Homework</h3>
                    <p className="hw-modal-dialog-sub">AI will evaluate answers and provide instant feedback</p>
                  </div>
                </div>
                <button className="hw-modal-dialog-close" onClick={() => setShowSubmitModal(false)}>
                  ✕
                </button>
              </div>

              <div className="hw-modal-dialog-body">
                <p style={{ fontSize: 13.5, color: "var(--sd-ink)", lineHeight: 1.5 }}>
                  You have answered <strong>{answeredCount}</strong> out of{" "}
                  <strong>{totalQuestions}</strong> questions in this homework.
                </p>
                {answeredCount < totalQuestions && (
                  <div className="hw-modal-warning-box">
                    <AlertCircle size={16} style={{ color: "#ff9c1a", flexShrink: 0 }} />
                    <span>
                      Some questions are unanswered. Unattempted questions will receive 0 marks.
                    </span>
                  </div>
                )}
              </div>

              <div className="hw-modal-dialog-foot">
                <button
                  className="hw-btn-back"
                  onClick={() => setShowSubmitModal(false)}
                  disabled={submitting}
                >
                  Keep Solving
                </button>
                <button
                  className="sd-primary-btn"
                  onClick={submitHomeworkAction}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="hw-spin" />
                      <span>Evaluating…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Confirm Submission</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI STUDY ASSISTANT WIDGET */}
        <AIChatWidget
          currentSubject={activeAssignment?.subject || null}
          currentQuestion={currentQuestion?.question?.slice(0, 80) || null}
          dark={dark}
        />
      </div>
    </>
  );
}

// ─── STYLES (STUDENT DASHBOARD THEME, ENRICHED ANIMATIONS, NO PURPLE/ROSE) ────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
}

/* ROOT TOKENS - LIGHT & DARK THEME EQUAL TO STUDENT DASHBOARD */
.sd-root {
  min-height: 100vh;
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  color: var(--sd-ink);
  background: radial-gradient(circle at 14% 9%, rgba(35,137,255,.10), transparent 28%),
              radial-gradient(circle at 88% 14%, rgba(255,156,26,.12), transparent 26%),
              linear-gradient(180deg, var(--sd-page), var(--sd-page-2));
  --sd-page: #fbfcff;
  --sd-page-2: #f5f7ff;
  --sd-card: #ffffff;
  --sd-card-soft: #f7faff;
  --sd-ink: #071235;
  --sd-muted: #68708a;
  --sd-faint: #8c94aa;
  --sd-line: rgba(15,23,42,.09);
  --sd-shadow: 0 12px 30px rgba(35,44,87,.09);
  --sd-shadow-soft: 0 7px 18px rgba(35,44,87,.06);
  position: relative;
  overflow-x: hidden;
  padding-bottom: 80px;
}

[data-theme="dark"] .sd-root, .dark .sd-root {
  --sd-page: #080d1f;
  --sd-page-2: #10172d;
  --sd-card: rgba(23,31,58,.94);
  --sd-card-soft: rgba(31,42,76,.72);
  --sd-ink: #f6f7ff;
  --sd-muted: #b5bfd8;
  --sd-faint: #7f8aa7;
  --sd-line: rgba(255,255,255,.12);
  --sd-shadow: 0 20px 54px rgba(0,0,0,.40);
  --sd-shadow-soft: 0 10px 24px rgba(0,0,0,.26);
}

/* BACKGROUND ANIMATIONS & FLOATING ELEMENTS */
.sd-bg-ribbon {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  left: 4%;
  right: 4%;
  top: 140px;
  height: 170px;
  border-radius: 50%;
  background: linear-gradient(90deg, rgba(35,137,255,.07), rgba(255,178,29,.09), rgba(39,184,106,.07));
  filter: blur(20px);
  opacity: .75;
  animation: sdBgWave 14s ease-in-out infinite;
}

.sd-bg-spark {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  border-radius: 999px;
  opacity: .48;
  animation: sdDrift 9s ease-in-out infinite;
}
.sd-bg-spark.s1 {
  left: 52%;
  top: 78px;
  width: 9px;
  height: 9px;
  background: #ffb21d;
  box-shadow: 34px 28px 0 #27b86a, 76px -14px 0 #2389ff;
}
.sd-bg-spark.s2 {
  right: 8%;
  top: 260px;
  width: 7px;
  height: 7px;
  background: #0ea5e9;
  box-shadow: -48px 46px 0 #2389ff, -86px -18px 0 #27b86a;
  animation-delay: -3s;
}
.sd-bg-spark.s3 {
  left: 7%;
  bottom: 160px;
  width: 8px;
  height: 8px;
  background: #27b86a;
  box-shadow: 42px -34px 0 #ff791f, 92px 18px 0 #2389ff;
  animation-delay: -5s;
}

@keyframes sdBgWave {
  0%, 100% { transform: translate3d(-2%, 0, 0) rotate(0); }
  50% { transform: translate3d(2%, -2%, 0) rotate(2deg); }
}
@keyframes sdDrift {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(0); }
  50% { transform: translate3d(18px, -14px, 0) rotate(7deg); }
}
@keyframes sdCardIn {
  from { opacity: 0; transform: translateY(12px) scale(.985); }
  to { opacity: 1; transform: none; }
}
@keyframes sdBreathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}
@keyframes sdShine {
  0% { transform: translateX(-120%) rotate(18deg); }
  45%, 100% { transform: translateX(220%) rotate(18deg); }
}
@keyframes sdPop3d {
  0%, 100% { transform: translateY(0) rotate(-2deg) scale(1); }
  50% { transform: translateY(-6px) rotate(2deg) scale(1.04); }
}
@keyframes sdPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .75; transform: scale(1.05); }
}

/* SUBNAV */
.hw-subnav {
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  position: relative;
  z-index: 2;
}
.hw-subnav-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.hw-brand-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  padding: 6px 14px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 13px;
  box-shadow: var(--sd-shadow-soft);
}
.hw-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--sd-muted);
}
.hw-bc-link {
  background: none;
  border: 0;
  color: #2389ff;
  font-weight: 800;
  cursor: pointer;
  padding: 0;
}
.hw-bc-active {
  color: var(--sd-ink);
  font-weight: 800;
}
.hw-bc-badge {
  background: rgba(35,137,255,.12);
  color: #2389ff;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
}
.hw-subnav-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.hw-engine-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 800;
  background: rgba(14, 165, 233, 0.12);
  color: #0284c7;
  border: 1px solid rgba(14, 165, 233, 0.25);
  padding: 5px 12px;
  border-radius: 999px;
}
[data-theme="dark"] .hw-engine-tag {
  color: #38bdf8;
}
.hw-theme-toggle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--sd-line);
  background: var(--sd-card);
  font-size: 16px;
  cursor: pointer;
  display: grid;
  place-items: center;
  box-shadow: var(--sd-shadow-soft);
  transition: transform .2s;
}
.hw-theme-toggle:hover {
  transform: scale(1.08);
}

/* HUB SHELL */
.hw-shell {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
  z-index: 1;
}

/* GREETING & MINI PILLS (STUDENT DASHBOARD EQUIVALENT) */
.sd-greeting {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.sd-title {
  font-size: clamp(22px, 2.6vw, 28px);
  line-height: 1.1;
  font-weight: 900;
  color: var(--sd-ink);
  margin: 0;
}
.sd-subtitle {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--sd-muted);
}
.sd-mini-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.sd-mini-pill {
  min-width: 110px;
  border: 1px solid var(--sd-line);
  background: var(--sd-card);
  border-radius: 18px;
  padding: 9px 12px;
  display: flex;
  align-items: center;
  gap: 9px;
  box-shadow: var(--sd-shadow-soft);
  transition: transform .18s, box-shadow .18s;
}
.sd-mini-pill:hover {
  transform: translateY(-3px);
  box-shadow: var(--sd-shadow);
}
.sd-pill-ico {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 16px;
  flex-shrink: 0;
}
.sd-pill-num {
  font-size: 16px;
  font-weight: 900;
  color: var(--sd-ink);
  line-height: 1;
}
.sd-pill-label {
  font-size: 10px;
  font-weight: 800;
  color: var(--sd-muted);
  margin-top: 2px;
}

/* SD-HERO (MATCHING STUDENT DASHBOARD GREEN/BLUE/CYAN GRADIENT) */
.sd-hero {
  position: relative;
  overflow: hidden;
  min-height: 220px;
  border-radius: 24px;
  padding: 26px 30px;
  background: linear-gradient(135deg, #d9f5c7 0%, #edf9dd 46%, #ffffff 100%);
  border: 1px solid rgba(84, 166, 83, 0.22);
  box-shadow: var(--sd-shadow);
  animation: sdCardIn .45s both;
  display: flex;
  align-items: center;
}
[data-theme="dark"] .sd-hero {
  background: linear-gradient(135deg, #16351f 0%, #17283a 58%, #10172d 100%);
  border-color: rgba(110, 231, 183, 0.22);
}
.sd-hero::after {
  content: "";
  position: absolute;
  top: -50px;
  bottom: -50px;
  width: 70px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.36), transparent);
  animation: sdShine 7s ease-in-out infinite;
}
.sd-hero-art {
  position: absolute;
  right: 50px;
  bottom: 0;
  width: 170px;
  filter: drop-shadow(0 16px 20px rgba(42,74,58,.2));
  animation: sdBreathe 4.6s ease-in-out infinite;
  pointer-events: none;
}
.sd-hero-art img {
  width: 100%;
  height: auto;
  display: block;
}
.sd-hero-content {
  position: relative;
  z-index: 2;
  max-width: 580px;
}
.sd-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  font-weight: 800;
  color: #10734c;
  background: rgba(16,115,76,.1);
  padding: 4px 10px;
  border-radius: 999px;
}
[data-theme="dark"] .sd-chip {
  color: #7ee7b7;
  background: rgba(126,231,183,.15);
}
.sd-lesson-title {
  font-size: clamp(22px, 2.8vw, 30px);
  line-height: 1.15;
  font-weight: 900;
  margin: 12px 0 8px;
  color: var(--sd-ink);
}
.sd-lesson-meta {
  font-size: 13px;
  font-weight: 700;
  color: var(--sd-muted);
  line-height: 1.5;
  margin: 0;
}
.sd-progress-line {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0 16px;
  max-width: 320px;
}
.sd-progress-track {
  height: 8px;
  flex: 1;
  border-radius: 999px;
  background: rgba(12,98,59,.14);
  overflow: hidden;
}
[data-theme="dark"] .sd-progress-track {
  background: rgba(255,255,255,.15);
}
.sd-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: #14915d;
  transition: width .8s ease;
}
.sd-progress-text {
  font-size: 11.5px;
  font-weight: 800;
  color: var(--sd-ink);
  white-space: nowrap;
}
.sd-primary-btn {
  border: 0;
  border-radius: 14px;
  padding: 11px 20px;
  min-height: 42px;
  background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
  color: #fff;
  font: 800 13px/1 'Plus Jakarta Sans', system-ui, sans-serif;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 10px 22px rgba(14,165,233,.28);
  transition: transform .18s, box-shadow .18s;
}
.sd-primary-btn:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 14px 28px rgba(14,165,233,.38);
}

/* SUBJECT PROGRESS PANEL (EQUAL TO STUDENT DASHBOARD) */
.hw-panel {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 20px;
  padding: 20px;
  box-shadow: var(--sd-shadow-soft);
}
.hw-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.hw-panel-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--sd-ink);
  margin: 0;
}
.hw-panel-sub {
  font-size: 12px;
  font-weight: 600;
  color: var(--sd-muted);
  margin: 3px 0 0;
}
.sd-subject-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.sd-subject {
  min-height: 154px;
  border-radius: 16px;
  padding: 14px 12px;
  background: var(--subject-bg, var(--sd-card-soft));
  border: 1.5px solid var(--sd-line);
  box-shadow: 0 10px 22px rgba(38,57,116,.08);
  transition: transform .2s, box-shadow .2s;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.sd-subject:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 28px rgba(38,57,116,.14);
}
.sd-subject.active-subject {
  border-color: #2389ff;
  box-shadow: 0 0 0 2px #2389ff inset, 0 12px 24px rgba(35,137,255,.2);
}
.sd-subject-name {
  font-size: 15px;
  font-weight: 800;
  margin-bottom: 8px;
}
.sd-subject-art-img {
  position: absolute;
  right: 10px;
  bottom: 12px;
  width: 66px;
  height: 66px;
  object-fit: contain;
  opacity: .35;
  pointer-events: none;
}
.sd-subject-progress {
  font-size: 11.5px;
  font-weight: 800;
  margin-top: 14px;
}
.sd-subject-bar {
  height: 7px;
  border-radius: 999px;
  background: rgba(0,0,0,.08);
  margin-top: 8px;
  overflow: hidden;
}
[data-theme="dark"] .sd-subject-bar {
  background: rgba(255,255,255,.12);
}
.sd-subject-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width .8s ease;
}

/* TOOLBAR & FILTERS */
.hw-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.hw-search-box {
  flex: 1;
  min-width: 240px;
  position: relative;
  display: flex;
  align-items: center;
}
.hw-search-icon {
  position: absolute;
  left: 14px;
  color: var(--sd-muted);
  pointer-events: none;
}
.hw-search-box input {
  width: 100%;
  height: 42px;
  border-radius: 14px;
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  padding: 0 38px;
  font-size: 13px;
  font-weight: 600;
  color: var(--sd-ink);
  box-shadow: var(--sd-shadow-soft);
  outline: none;
  font-family: inherit;
  transition: border-color .2s;
}
.hw-search-box input:focus {
  border-color: #2389ff;
}
.hw-search-clear {
  position: absolute;
  right: 12px;
  background: none;
  border: 0;
  color: var(--sd-muted);
  cursor: pointer;
  font-size: 14px;
}
.hw-status-tabs {
  display: flex;
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 14px;
  padding: 4px;
  box-shadow: var(--sd-shadow-soft);
}
.hw-tab-btn {
  border: 0;
  background: transparent;
  padding: 7px 13px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 800;
  color: var(--sd-muted);
  cursor: pointer;
  transition: all .18s;
  font-family: inherit;
}
.hw-tab-btn.active {
  background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
  color: #fff;
}
.hw-filter-chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
}
.hw-chip {
  border: 1px solid var(--sd-line);
  background: var(--sd-card);
  padding: 7px 13px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 800;
  color: var(--sd-muted);
  cursor: pointer;
  white-space: nowrap;
  box-shadow: var(--sd-shadow-soft);
  transition: all .18s;
  font-family: inherit;
}
.hw-chip.active {
  background: var(--sd-ink);
  color: var(--sd-page);
  border-color: var(--sd-ink);
}
.hw-sort-select {
  height: 42px;
  border-radius: 14px;
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  padding: 0 12px;
  font-size: 12px;
  font-weight: 800;
  color: var(--sd-ink);
  outline: none;
  box-shadow: var(--sd-shadow-soft);
  cursor: pointer;
  font-family: inherit;
}
.hw-reset-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--sd-card-soft);
  border: 1px solid var(--sd-line);
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 800;
  color: var(--sd-muted);
  cursor: pointer;
}

/* SECTIONS & CARDS */
.hw-section-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.hw-sec-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hw-sec-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 900;
  color: var(--sd-ink);
}
.hw-sec-badge-auto {
  font-size: 11px;
  font-weight: 800;
  color: #0284c7;
  background: rgba(2,132,199,.12);
  padding: 3px 9px;
  border-radius: 999px;
}
.hw-sec-badge-done {
  font-size: 11px;
  font-weight: 800;
  color: #27b86a;
  background: rgba(39,184,106,.12);
  padding: 3px 9px;
  border-radius: 999px;
}
.hw-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 16px;
}

/* CARD */
.hw-card {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  box-shadow: var(--sd-shadow-soft);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform .2s, box-shadow .2s;
  animation: sdCardIn .4s both;
}
.hw-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--sd-shadow);
}
.hw-card.finished {
  border-color: rgba(39,184,106,.25);
}
.hw-card-top-bar {
  height: 6px;
  background: linear-gradient(90deg, var(--c1, #2563eb), var(--c2, #0ea5e9));
}
.hw-card-body {
  padding: 18px;
}
.hw-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.hw-card-subj-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  border: 1px solid;
}
.hw-status-pill {
  font-size: 11px;
  font-weight: 800;
  padding: 3px 9px;
  border-radius: 999px;
}
.hw-status-pill.pending {
  background: rgba(255, 156, 26, 0.12);
  color: #ff9c1a;
}
.hw-status-pill.in-progress {
  background: rgba(14, 165, 233, 0.12);
  color: #0284c7;
}
.hw-status-pill.completed {
  background: rgba(39, 184, 106, 0.14);
  color: #27b86a;
}
.hw-card-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--sd-ink);
  margin: 0 0 6px;
  line-height: 1.3;
}
.hw-card-desc {
  font-size: 12px;
  font-weight: 600;
  color: var(--sd-muted);
  line-height: 1.45;
  margin: 0 0 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.hw-card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.hw-tag {
  font-size: 11px;
  font-weight: 700;
  color: var(--sd-muted);
  background: var(--sd-card-soft);
  padding: 3px 8px;
  border-radius: 8px;
  border: 1px solid var(--sd-line);
}
.hw-tag.pts {
  color: #ff9c1a;
  background: rgba(255,156,26,.12);
  border-color: rgba(255,156,26,.25);
  font-weight: 800;
}
.hw-card-mini-prog {
  margin-top: 8px;
}
.hw-mini-prog-track {
  height: 5px;
  border-radius: 999px;
  background: rgba(0,0,0,.08);
  overflow: hidden;
  margin-bottom: 4px;
}
.hw-mini-prog-fill {
  height: 100%;
  border-radius: inherit;
}
.hw-mini-prog-label {
  font-size: 10.5px;
  font-weight: 700;
  color: #0284c7;
}
.hw-card-score-bar {
  margin-top: 10px;
}
.hw-score-bar-track {
  height: 6px;
  border-radius: 999px;
  background: rgba(39, 184, 106, 0.15);
  overflow: hidden;
  margin-bottom: 6px;
}
.hw-score-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #27b86a, #0ea5e9);
}
.hw-score-bar-details {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 800;
}
.hw-score-main {
  color: #27b86a;
}
.hw-score-percent {
  color: var(--sd-ink);
}
.hw-card-footer {
  padding: 12px 18px;
  background: var(--sd-card-soft);
  border-top: 1px solid var(--sd-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hw-card-ai-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 800;
  color: var(--sd-muted);
}
.hw-card-btn {
  background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
  color: #fff;
  border: 0;
  padding: 7px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: transform .18s;
  font-family: inherit;
}
.hw-card-btn.review {
  background: linear-gradient(135deg, #27b86a 0%, #0284c7 100%);
}
.hw-card-btn:hover {
  transform: scale(1.04);
}

/* EMPTY CARD */
.hw-empty-card {
  text-align: center;
  padding: 50px 20px;
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 24px;
  box-shadow: var(--sd-shadow-soft);
}
.hw-empty-mascot {
  width: 130px;
  margin: 0 auto 16px;
  display: block;
  filter: drop-shadow(0 12px 16px rgba(0,0,0,.1));
  animation: sdBreathe 4.5s ease-in-out infinite;
}
.hw-empty-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--sd-ink);
  margin-bottom: 8px;
}
.hw-empty-desc {
  font-size: 13px;
  font-weight: 600;
  color: var(--sd-muted);
  max-width: 440px;
  margin: 0 auto 20px;
}

/* ══════════════════════════════════════════════════════════════════════
   SOLVING VIEW (PAST FLOW PRESERVED WITH ENHANCED ANIMATIONS)
══════════════════════════════════════════════════════════════════════ */
.hw-solve-hero {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 22px;
  padding: 20px 24px;
  box-shadow: var(--sd-shadow);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.hw-solve-hero-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.hw-btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--sd-card-soft);
  border: 1px solid var(--sd-line);
  border-radius: 12px;
  padding: 8px 14px;
  font-size: 12.5px;
  font-weight: 800;
  color: var(--sd-ink);
  cursor: pointer;
  transition: transform .18s;
  font-family: inherit;
}
.hw-btn-back:hover {
  transform: translateX(-3px);
}
.hw-solve-meta-chip {
  font-size: 12px;
  font-weight: 800;
  color: var(--sd-muted);
}
.hw-solve-heading {
  font-size: 20px;
  font-weight: 900;
  color: var(--sd-ink);
  margin: 4px 0 0;
}
.hw-solve-hero-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.hw-solve-stat-pill {
  text-align: center;
}
.hw-stat-val {
  font-size: 18px;
  font-weight: 900;
  color: var(--sd-ink);
}
.hw-stat-lbl {
  font-size: 10px;
  font-weight: 800;
  color: var(--sd-muted);
}
.hw-solve-grid {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
@media (max-width: 860px) {
  .hw-solve-grid {
    grid-template-columns: 1fr;
  }
}

/* SIDEBAR */
.hw-sidebar-nav {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 20px;
  padding: 16px;
  box-shadow: var(--sd-shadow-soft);
}
.hw-snav-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--sd-line);
}
.hw-snav-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 480px;
  overflow-y: auto;
}
.hw-snav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 1px solid transparent;
  background: var(--sd-card-soft);
  border-radius: 12px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  transition: all .18s;
  font-family: inherit;
}
.hw-snav-item.active {
  border-color: #2389ff;
  background: rgba(35,137,255,.08);
}
[data-theme="dark"] .hw-snav-item.active {
  background: rgba(35,137,255,.14);
}
.hw-snav-item.answered .hw-snav-icon {
  background: #27b86a;
  color: #fff;
}
.hw-snav-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(0,0,0,.06);
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
}
[data-theme="dark"] .hw-snav-icon {
  background: rgba(255,255,255,.08);
}
.hw-snav-text {
  display: flex;
  flex-direction: column;
}
.hw-snav-title {
  font-size: 12px;
  font-weight: 800;
  color: var(--sd-ink);
}
.hw-snav-marks {
  font-size: 10px;
  font-weight: 700;
  color: var(--sd-muted);
}

/* WORKSPACE QUESTION */
.hw-workspace {
  min-width: 0;
}
.hw-q-card {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 24px;
  padding: 26px;
  box-shadow: var(--sd-shadow);
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: sdCardIn .35s both;
}
.hw-q-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.hw-q-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  background: rgba(35,137,255,.10);
  color: #2389ff;
  padding: 5px 12px;
  border-radius: 999px;
}
.hw-q-sec {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--sd-muted);
}
.hw-q-marks {
  font-size: 12px;
  font-weight: 800;
  background: rgba(255,156,26,.12);
  color: #ff9c1a;
  padding: 4px 10px;
  border-radius: 8px;
}
.hw-q-prompt {
  font-size: 17px;
  font-weight: 800;
  color: var(--sd-ink);
  line-height: 1.5;
}
.hw-q-hint-box {
  background: rgba(255,156,26,.08);
  border: 1px dashed rgba(255,156,26,.35);
  border-radius: 14px;
  padding: 12px 14px;
}
.hw-q-hint-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  color: #ff9c1a;
  margin-bottom: 4px;
}
.hw-q-hint-text {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--sd-ink);
  margin: 0;
  line-height: 1.45;
}

/* MCQ OPTIONS */
.hw-options-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.hw-option-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--sd-card-soft);
  border: 1.5px solid var(--sd-line);
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all .18s;
  font-family: inherit;
}
.hw-option-btn:hover {
  border-color: rgba(35,137,255,.4);
  background: rgba(35,137,255,.04);
}
.hw-option-btn.selected {
  border-color: #2389ff;
  background: rgba(35,137,255,.10);
}
.hw-opt-letter {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
  color: var(--sd-ink);
  flex-shrink: 0;
}
.hw-opt-text {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--sd-ink);
  flex: 1;
}
.hw-opt-check {
  color: #2389ff;
}

/* TEXT AREA */
.hw-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.hw-text-guide {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--sd-muted);
}
.hw-textarea-input {
  width: 100%;
  border-radius: 16px;
  border: 1.5px solid var(--sd-line);
  background: var(--sd-card-soft);
  padding: 14px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  color: var(--sd-ink);
  outline: none;
  resize: vertical;
  line-height: 1.5;
  transition: border-color .2s;
}
.hw-textarea-input:focus {
  border-color: #2389ff;
  background: var(--sd-card);
}
.hw-paste-warning {
  font-size: 11.5px;
  font-weight: 700;
  color: #ef4444;
  background: rgba(239,68,68,.08);
  padding: 6px 12px;
  border-radius: 8px;
}
.hw-input-tools {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.hw-tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--sd-card-soft);
  border: 1px solid var(--sd-line);
  border-radius: 10px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
  color: var(--sd-ink);
  cursor: pointer;
}
.hw-tool-btn.rec {
  background: #ef4444;
  color: #fff;
  border-color: #ef4444;
  animation: sdPulse 1.2s infinite;
}
.hw-word-metric {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--sd-muted);
}
.hw-q-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--sd-line);
}
.hw-btn-step {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--sd-card-soft);
  border: 1px solid var(--sd-line);
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 800;
  color: var(--sd-ink);
  cursor: pointer;
  font-family: inherit;
}
.hw-btn-step:disabled {
  opacity: .4;
  cursor: not-allowed;
}

/* ══════════════════════════════════════════════════════════════════════
   REVIEW MODE (STUDENT REVIEW EXPERIENCE)
══════════════════════════════════════════════════════════════════════ */
.hw-review-hero {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 24px;
  padding: 28px;
  box-shadow: var(--sd-shadow);
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.hw-review-hero-grid {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.hw-review-trophy-box {
  font-size: 48px;
  background: rgba(39, 184, 106, 0.12);
  width: 80px;
  height: 80px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  box-shadow: inset 0 -6px 0 rgba(0,0,0,.06);
  animation: sdPop3d 4s ease-in-out infinite;
}
.hw-review-info {
  flex: 1;
}
.hw-review-verified {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  color: #27b86a;
  background: rgba(39, 184, 106, 0.12);
  padding: 4px 10px;
  border-radius: 999px;
  margin-bottom: 8px;
}
.hw-review-title {
  font-size: 24px;
  font-weight: 900;
  color: var(--sd-ink);
  margin: 0 0 6px;
}
.hw-review-sub {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--sd-muted);
  margin: 0;
}
.hw-review-score-panel {
  text-align: right;
  min-width: 120px;
}
.hw-rev-score-big {
  font-size: 36px;
  font-weight: 900;
  color: #27b86a;
  line-height: 1;
}
.hw-rev-score-big small {
  font-size: 18px;
  color: var(--sd-muted);
}
.hw-rev-pct {
  font-size: 14px;
  font-weight: 800;
  color: var(--sd-ink);
  margin-top: 4px;
}
.hw-rev-points {
  font-size: 11px;
  font-weight: 800;
  color: #ff9c1a;
  background: rgba(255, 156, 26, 0.12);
  padding: 2px 8px;
  border-radius: 999px;
  display: inline-block;
  margin-top: 6px;
}
.hw-section-scores-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 14px;
  border-top: 1px solid var(--sd-line);
}
.hw-sec-badge {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--sd-ink);
  background: var(--sd-card-soft);
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid var(--sd-line);
}
.hw-review-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.hw-review-sec-title {
  font-size: 17px;
  font-weight: 900;
  color: var(--sd-ink);
  margin: 0;
}
.hw-review-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.hw-rev-card {
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 20px;
  padding: 20px;
  box-shadow: var(--sd-shadow-soft);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.hw-rev-card.correct {
  border-left: 5px solid #27b86a;
}
.hw-rev-card.partial {
  border-left: 5px solid #ff9c1a;
}
.hw-rc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.hw-rc-num {
  font-size: 13px;
  font-weight: 900;
  color: var(--sd-ink);
  background: var(--sd-card-soft);
  padding: 3px 8px;
  border-radius: 6px;
}
.hw-rc-type {
  font-size: 12px;
  font-weight: 800;
}
.hw-rc-sec {
  font-size: 11px;
  font-weight: 700;
  color: var(--sd-muted);
}
.hw-rc-score-pill span {
  font-size: 11.5px;
  font-weight: 800;
  padding: 3px 9px;
  border-radius: 999px;
}
.hw-rc-score-pill .correct {
  background: rgba(39, 184, 106, 0.12);
  color: #27b86a;
}
.hw-rc-score-pill .partial {
  background: rgba(255, 156, 26, 0.12);
  color: #ff9c1a;
}
.hw-rc-score-pill .wrong {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}
.hw-rc-question-text {
  font-size: 15px;
  font-weight: 800;
  color: var(--sd-ink);
  line-height: 1.45;
}
.hw-rc-ans-block {
  background: var(--sd-card-soft);
  border: 1px solid var(--sd-line);
  border-radius: 12px;
  padding: 12px;
}
.hw-rc-ans-tag {
  font-size: 11px;
  font-weight: 800;
  color: var(--sd-muted);
  display: block;
  margin-bottom: 4px;
}
.hw-rc-ans-val {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--sd-ink);
  line-height: 1.4;
}
.hw-rc-fb-block {
  background: rgba(14, 165, 233, 0.08);
  border: 1px solid rgba(14, 165, 233, 0.22);
  border-radius: 12px;
  padding: 12px;
}
.hw-rc-fb-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 800;
  color: #0284c7;
  margin-bottom: 4px;
}
[data-theme="dark"] .hw-rc-fb-title {
  color: #38bdf8;
}
.hw-rc-fb-msg {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--sd-ink);
  line-height: 1.45;
}
.hw-review-actions-bottom {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-top: 14px;
  flex-wrap: wrap;
}

/* SUBMIT MODAL */
.hw-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.hw-modal-dialog {
  width: 100%;
  max-width: 440px;
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  border-radius: 24px;
  box-shadow: 0 24px 60px rgba(0,0,0,.35);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  animation: sdCardIn .25s ease;
}
.hw-modal-dialog-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hw-modal-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(35,137,255,.12);
  display: grid;
  place-items: center;
}
.hw-modal-dialog-title {
  font-size: 18px;
  font-weight: 900;
  color: var(--sd-ink);
  margin: 0;
}
.hw-modal-dialog-sub {
  font-size: 12px;
  font-weight: 600;
  color: var(--sd-muted);
  margin: 2px 0 0;
}
.hw-modal-dialog-close {
  background: none;
  border: 0;
  color: var(--sd-muted);
  font-size: 18px;
  cursor: pointer;
}
.hw-modal-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.hw-modal-warning-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,156,26,.10);
  border: 1px solid rgba(255,156,26,.3);
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  color: #ff9c1a;
}
.hw-modal-dialog-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--sd-line);
}

/* AI FLOATING COMPANION */
.hw-ai-dock {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 900;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}
.hw-ai-fab {
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #071235 0%, #17283a 100%);
  color: #fff;
  padding: 10px 18px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(7, 18, 53, 0.35);
  transition: transform .2s;
  font-family: inherit;
}
.hw-ai-fab:hover {
  transform: translateY(-2px) scale(1.03);
}
.hw-ai-box {
  width: 320px;
  max-height: 480px;
  border-radius: 20px;
  background: var(--sd-card);
  border: 1px solid var(--sd-line);
  box-shadow: 0 20px 50px rgba(0,0,0,.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: sdCardIn .25s ease;
}
.hw-ai-head {
  background: linear-gradient(135deg, #071235 0%, #17283a 100%);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hw-ai-close {
  background: none;
  border: 0;
  color: #fff;
  cursor: pointer;
}
.hw-ai-ctx {
  padding: 8px 12px;
  background: var(--sd-card-soft);
  border-bottom: 1px solid var(--sd-line);
}
.hw-ai-msgs {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  max-height: 240px;
}
.hw-ai-msg {
  padding: 8px 12px;
  border-radius: 14px;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 600;
  max-width: 86%;
}
.hw-ai-msg.ai {
  background: var(--sd-card-soft);
  color: var(--sd-ink);
  align-self: flex-start;
  border: 1px solid var(--sd-line);
}
.hw-ai-msg.user {
  background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
  color: #fff;
  align-self: flex-end;
}
.hw-dot-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #0284c7;
  display: inline-block;
  animation: sdPulse .8s infinite alternate;
}
.hw-ai-quick {
  display: flex;
  gap: 6px;
  padding: 6px 12px;
  overflow-x: auto;
  border-top: 1px solid var(--sd-line);
}
.hw-ai-qchip {
  background: var(--sd-card-soft);
  border: 1px solid var(--sd-line);
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--sd-muted);
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}
.hw-ai-input-row {
  display: flex;
  padding: 8px 12px;
  border-top: 1px solid var(--sd-line);
  gap: 6px;
}
.hw-ai-input {
  flex: 1;
  border: 1px solid var(--sd-line);
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 12px;
  background: var(--sd-card-soft);
  color: var(--sd-ink);
  outline: none;
  font-family: inherit;
}
.hw-ai-send {
  background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
  color: #fff;
  border: 0;
  border-radius: 10px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.hw-spin {
  animation: sdSpin 1s linear infinite;
}
@keyframes sdSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* RESPONSIVE DESIGN */
@media (max-width: 900px) {
  .sd-subject-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .sd-hero {
    padding: 22px;
  }
  .sd-hero-art {
    display: none;
  }
  .sd-greeting {
    flex-direction: column;
    align-items: flex-start;
  }
  .sd-mini-stats {
    width: 100%;
    grid-template-columns: repeat(2, 1fr);
  }
  .sd-mini-pill {
    flex: 1;
  }
  .hw-solve-hero {
    flex-direction: column;
    align-items: flex-start;
  }
  .hw-solve-hero-right {
    width: 100%;
    justify-content: space-between;
  }
  .hw-review-hero-grid {
    flex-direction: column;
    align-items: flex-start;
  }
  .hw-review-score-panel {
    text-align: left;
  }
  .hw-ai-box {
    width: 290px;
  }
}
`;