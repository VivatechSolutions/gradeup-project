export type SlideType =
  | "hook"
  | "think"
  | "learn"
  | "try-it"
  | "real-world"
  | "apply"
  | "mystery"
  | "teach-back"
  | "mastery"
  | "next-concept";

export interface SlideOption {
  id: string;
  label?: string; // e.g. "A", "B", "C", "D"
  title: string;
  description?: string;
  icon?: string;
  isCorrect?: boolean;
  explanation?: string;
  imageUrl?: string;
  audio?: VoiceAudio;
}

export interface VoiceAudio {
  male?: string;
  female?: string;
}

export interface NarrationCue {
  id: string;
  text?: string;
  emotion?: string;
  audio?: VoiceAudio;
}

export interface SlideResolution {
  segmentId?: string;
  text?: string;
  emotion?: string;
  imageUrl?: string;
  audio?: VoiceAudio;
}

export interface ClueItem {
  id: string;
  number: number;
  text: string;
}

export interface VisualComparison {
  beforeTitle: string;
  beforeSubtitle?: string;
  beforeImage?: string;
  afterTitle: string;
  afterSubtitle?: string;
  afterImage?: string;
}

export interface ActivityItem {
  id: string;
  name: string;
  subtext?: string;
  iconName?: string;
}

export interface SlideData {
  id: string;
  segmentId?: string;
  phase?: string;
  emotion?: string;
  audio?: VoiceAudio;
  questionAudio?: VoiceAudio;
  introNarration?: NarrationCue[];
  completionNarration?: NarrationCue[];
  suggestedQuestions?: string[];
  segments?: SlideData[];
  resolutions?: Record<string, SlideResolution>;
  slideNumber: number;
  type: SlideType;
  badge: {
    label: string;
    icon?: string;
  };
  title: string;
  highlightWords?: string[]; // words to highlight with accent color in title
  subtitle?: string;
  description?: string;
  content?: string;
  images?: {
    main?: string;
    diagram?: string;
    comparison?: VisualComparison;
    items?: ActivityItem[];
    caption?: string;
    gallery?: string[];
  };
  options?: SlideOption[];
  question?: string;
  clues?: ClueItem[];
  instructions?: string[];
  keyPoints?: string[];
  takeaway?: {
    label?: string;
    text: string;
  };
  callout?: {
    title?: string;
    text: string;
    type?: "tip" | "info" | "warning";
  };
  task: {
    type: "narration" | "button-click" | "select-option" | "submit-answer" | "record-or-type" | "confirm-activity";
    buttonLabel?: string;
    completedButtonLabel?: string;
    requiredAnswersCount?: number;
    initialCompleted?: boolean;
  };
  avatarMessage?: {
    initial: string;
    inProgress?: string;
    completed: string;
    error?: string;
  };
  nextLessonTitle?: string;
  nextLessonDescription?: string;
}

export interface LessonData {
  id: string;
  subject: string;
  unitNumber: number;
  lessonTitle: string;
  totalSlides: number;
  slides: SlideData[];
}

export interface TaskState {
  isCompleted: boolean;
  selectedOptionIds: string[];
  revealedCorrectOptionId?: string;
  isFeedbackPlaying?: boolean;
  submittedText?: string;
  isVoiceRecorded?: boolean;
  isCorrect?: boolean;
  feedbackMessage?: string;
}

