import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { 
  Clock, 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  BookOpen,
  Award,
  Target,
  ArrowLeft,
  Bookmark
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "../lib/utils";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { useNotificationStore } from "../lib/notification-store";
import QuizSidebar from "../components/quiz-sidebar";
import { motion, AnimatePresence } from "framer-motion";

// Web Speech API declarations
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Question {
  id: number;
  text: string;
  type: 'mcq' | 'verbal';
  options?: string[];
  correctAnswer?: string;
  subject: string;
  unit?: string; // Added unit property
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

interface ExamSession {
  id: string;
  questions: Question[];
  currentIndex: number;
  answers: Record<number, string>;
  markedForReview: Record<number, boolean>;
  startTime: Date;
  duration: number; // in minutes
  isActive: boolean;
}

const dummyQuestions: Question[] = [
    {
        id: 1,
        text: "What is the powerhouse of the cell?",
        type: 'mcq',
        options: ["Nucleus", "Ribosome", "Mitochondria", "Chloroplast"],
        correctAnswer: "Mitochondria",
        subject: "Biology",
        unit: "Cell Biology",
        difficulty: 'easy',
        explanation: "Mitochondria are responsible for generating most of the cell's supply of adenosine triphosphate (ATP), used as a source of chemical energy."
    },
    {
        id: 2,
        text: "Solve for x: 2x + 3 = 11",
        type: 'mcq',
        options: ["3", "4", "5", "6"],
        correctAnswer: "4",
        subject: "Mathematics",
        unit: "Algebra Basics",
        difficulty: 'easy',
        explanation: "Subtract 3 from both sides to get 2x = 8, then divide by 2 to get x = 4."
    },
    {
        id: 3,
        text: "Who wrote 'To Kill a Mockingbird'?",
        type: 'mcq',
        options: ["Harper Lee", "J.K. Rowling", "Ernest Hemingway", "Mark Twain"],
        correctAnswer: "Harper Lee",
        subject: "English Literature",
        unit: "Shakespeare", // Assuming a general unit for literature
        difficulty: 'medium',
        explanation: "Harper Lee's 'To Kill a Mockingbird' was published in 1960 and became an instant classic of American literature."
    },
    {
        id: 4,
        text: "What is the chemical symbol for gold?",
        type: 'mcq',
        options: ["Ag", "Go", "Au", "Gd"],
        correctAnswer: "Au",
        subject: "Chemistry",
        unit: "Atomic Structure",
        difficulty: 'easy',
        explanation: "The symbol Au comes from the Latin word for gold, 'aurum'."
    },
    {
        id: 5,
        text: "Explain the theory of relativity in your own words.",
        type: 'verbal',
        subject: "Physics",
        unit: "Kinematics", // General unit for physics
        difficulty: 'hard',
        explanation: "Einstein's theory of relativity is split into special and general relativity. Special relativity deals with the relationship between space and time for objects moving at constant speeds. General relativity is a theory of gravitation."
    },
    {
        id: 6,
        text: "What year did the Titanic sink?",
        type: 'mcq',
        options: ["1905", "1912", "1918", "1923"],
        correctAnswer: "1912",
        subject: "History",
        unit: "Ancient Civilizations", // General unit for history
        difficulty: 'medium',
        explanation: "The RMS Titanic sank in the early morning hours of 15 April 1912 in the North Atlantic Ocean."
    },
    {
        id: 7,
        text: "What is the largest planet in our solar system?",
        type: 'mcq',
        options: ["Earth", "Mars", "Jupiter", "Saturn"],
        correctAnswer: "Jupiter",
        subject: "Physics",
        unit: "Dynamics", // General unit for physics
        difficulty: 'easy',
        explanation: "Jupiter is the fifth planet from the Sun and the largest in the Solar System. It is a gas giant with a mass more than two and a half times that of all the other planets in the Solar System combined."
    },
    {
        id: 8,
        text: "Describe the process of photosynthesis.",
        type: 'verbal',
        subject: "Biology",
        unit: "Genetics", // General unit for biology
        difficulty: 'hard',
        explanation: "Photosynthesis is a process used by plants, algae, and certain bacteria to convert light energy into chemical energy, through a process that converts carbon dioxide and water into glucose (sugar) and oxygen."
    },
    {
        id: 9,
        text: "What is the capital of Japan?",
        type: 'mcq',
        options: ["Kyoto", "Osaka", "Tokyo", "Hiroshima"],
        correctAnswer: "Tokyo",
        subject: "History",
        unit: "World War II", // General unit for history
        difficulty: 'easy',
        explanation: "Tokyo is the capital and largest city of Japan."
    },
    {
        id: 10,
        text: "Who is credited with inventing the telephone?",
        type: 'mcq',
        options: ["Thomas Edison", "Nikola Tesla", "Alexander Graham Bell", "Guglielmo Marconi"],
        correctAnswer: "Alexander Graham Bell",
        subject: "History",
        unit: "Ancient Civilizations", // General unit for history
        difficulty: 'medium',
        explanation: "Alexander Graham Bell is widely credited with patenting the first practical telephone."
    }
];


export default function QuizPage() {
  const { user } = useAuth();
  const { addNotification } = useNotificationStore();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [examSession, setExamSession] = useState<ExamSession | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [verbalAnswer, setVerbalAnswer] = useState<string>("");
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [examResults, setExamResults] = useState<any>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  const searchParams = new URLSearchParams(location.split("?")[1]);
  const from = searchParams.get("from");

  const [quizSubject, setQuizSubject] = useState<string>(() => {
    return searchParams.get("subject") || localStorage.getItem("ai-tutor-selected-subject") || "all";
  });
  const [quizUnit, setQuizUnit] = useState<string>(() => {
    return searchParams.get("unit") || localStorage.getItem("ai-tutor-selected-unit") || "";
  });

  useEffect(() => {
    const storedSubject = localStorage.getItem("ai-tutor-selected-subject");
    const storedUnit = localStorage.getItem("ai-tutor-selected-unit");
    if (storedSubject) {
      setQuizSubject(storedSubject);
    }
    if (storedUnit) {
      setQuizUnit(storedUnit);
    }
  }, []);

  const { data: subjects } = useQuery({
    queryKey: ["/api/subjects"],
  });

  // Default subjects for practice exams
  const availableSubjects = [
    { id: 1, name: "Mathematics", description: "Algebra, Geometry, Calculus" },
    { id: 2, name: "Physics", description: "Mechanics, Thermodynamics, Optics" },
    { id: 3, name: "Chemistry", description: "Organic, Inorganic, Physical" },
    { id: 4, name: "Biology", description: "Cell Biology, Genetics, Ecology" },
    { id: 5, name: "English", description: "Grammar, Literature, Writing" },
    { id: 6, name: "History", description: "World History, Geography" },
  ];

  const { data: examHistory } = useQuery({
    queryKey: ["/api/student/exam-history"],
  });

  const startExamMutation = useMutation({
    mutationFn: async (config: { subject: string; unit?: string; questionCount: number; duration: number; type: string }) => {
      // Simulate API delay
      await new Promise(res => setTimeout(res, 500)); 

      let filteredQuestions = dummyQuestions;

      if (config.subject && config.subject !== "all") {
        filteredQuestions = filteredQuestions.filter(q => q.subject.toLowerCase() === config.subject.toLowerCase());
      }
      if (config.unit) {
        filteredQuestions = filteredQuestions.filter(q => q.unit?.toLowerCase() === config.unit.toLowerCase());
      }

      // If no questions match, or if too few, provide a fallback or error.
      if (filteredQuestions.length === 0) {
        // Fallback to general questions if no specific questions match
        filteredQuestions = dummyQuestions.filter(q => q.subject.toLowerCase() === "mathematics"); // Example fallback
        if (filteredQuestions.length === 0) {
            throw new Error("No questions found for the selected subject and unit.");
        }
      }

      // Randomly select `questionCount` questions from the filtered list
      const selectedQuestions = filteredQuestions
        .sort(() => 0.5 - Math.random()) // Shuffle
        .slice(0, config.questionCount); // Take first 'questionCount'

      return {
          id: `session-${Date.now()}`,
          questions: selectedQuestions,
          currentIndex: 0,
          answers: {},
          markedForReview: {},
          startTime: new Date(),
          duration: config.duration,
          isActive: true
      };
    },
    onSuccess: (data) => {
      setExamSession({ ...data, markedForReview: {} });
      setTimeRemaining(data.duration * 60);
      setShowResults(false);
      setSelectedAnswer("");
      setVerbalAnswer("");
      
      // Auto-play first question if enabled
      if (autoPlay && data.questions[0]) {
        speakText(data.questions[0].text);
      }
    },
  });

  const submitExamMutation = useMutation({
    mutationFn: async (examData: any) => {
        await new Promise(res => setTimeout(res, 500));
        const score = Object.entries(examData.answers).reduce((acc, [qId, answer]) => {
            const question = dummyQuestions.find(q => q.id === parseInt(qId));
            if (question && question.correctAnswer === answer) {
                return acc + 1;
            }
            return acc;
        }, 0);
        
        return {
            score,
            totalQuestions: dummyQuestions.length,
            percentage: Math.round((score / dummyQuestions.length) * 100),
        };
    },
    onSuccess: (results) => {
      setExamResults(results);
      setShowResults(true);
      setExamSession(null);
      queryClient.invalidateQueries({ queryKey: ["/api/student/exam-history"] });
      addNotification(`Quiz completed! Your score: ${results.score}/${results.totalQuestions}`);
      toast({
        title: "Exam Completed",
        description: `Score: ${results.score}/${results.totalQuestions}`,
      });
    },
  });

  // Timer effect
  useEffect(() => {
    if (examSession?.isActive && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examSession?.isActive, timeRemaining]);

  // Text-to-Speech functionality
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB'; // UK English
      utterance.rate = 0.8;
      utterance.pitch = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      speechSynthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Voice recording functionality using Web Speech API
  const startRecording = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Speech Recognition Unavailable",
        description: "Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.",
        variant: "destructive",
      });
      return;
    }

    // Check microphone permissions
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (permissionError) {
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to use voice answers.",
        variant: "destructive",
      });
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'en-GB'; // UK English
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        toast({
          title: "Listening...",
          description: "Speak clearly into your microphone. Click stop when finished.",
        });
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          } else {
            transcript += event.results[i][0].transcript;
          }
        }
        setVerbalAnswer(transcript.trim());
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        console.error('Speech recognition error:', event.error);
        
        let errorMessage = "Speech recognition failed. ";
        switch (event.error) {
          case 'no-speech':
            errorMessage = "No speech detected. Please try speaking again.";
            break;
          case 'audio-capture':
            errorMessage = "No microphone found. Please check your microphone.";
            break;
          case 'not-allowed':
            errorMessage = "Microphone access denied. Please allow microphone access.";
            break;
          case 'network':
            errorMessage = "Network error occurred. Please check your connection.";
            break;
          default:
            errorMessage = "Please try again or type your answer.";
        }
        
        toast({
          title: "Speech Recognition Error",
          description: errorMessage,
          variant: "destructive",
        });
      };

      recognition.onend = () => {
        setIsRecording(false);
        toast({
          title: "Recording Complete",
          description: "Your speech has been transcribed. Review and submit your answer.",
        });
      };

      recognition.start();
      mediaRecorderRef.current = recognition as any;
      
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      toast({
        title: "Recording Error",
        description: "Could not start speech recognition. Please ensure your browser supports this feature.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (typeof mediaRecorderRef.current.stop === 'function') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    }
  };

  const handleNextQuestion = () => {
    if (!examSession) return;
    
    // Save current answer
    const currentQuestion = examSession.questions[examSession.currentIndex];
    const answer = currentQuestion.type === 'mcq' ? selectedAnswer : verbalAnswer;
    
    const updatedAnswers = { ...examSession.answers, [currentQuestion.id]: answer };
    const updatedSession = {
      ...examSession,
      currentIndex: examSession.currentIndex + 1,
      answers: updatedAnswers,
    };
    
    setExamSession(updatedSession);
    setSelectedAnswer("");
    setVerbalAnswer("");
    
    // Auto-play next question
    if (autoPlay && updatedSession.questions[updatedSession.currentIndex]) {
      setTimeout(() => {
        speakText(updatedSession.questions[updatedSession.currentIndex].text);
      }, 500);
    }
  };

  const handlePreviousQuestion = () => {
    if (!examSession || examSession.currentIndex === 0) return;
    
    const updatedSession = {
      ...examSession,
      currentIndex: examSession.currentIndex - 1,
    };
    
    setExamSession(updatedSession);
    
    // Load previous answer
    const prevQuestion = examSession.questions[updatedSession.currentIndex];
    const prevAnswer = examSession.answers[prevQuestion.id] || "";
    
    if (prevQuestion.type === 'mcq') {
      setSelectedAnswer(prevAnswer);
    } else {
      setVerbalAnswer(prevAnswer);
    }
  };

  const handleQuestionSelect = (index: number) => {
    if (!examSession) return;

    const updatedSession = {
      ...examSession,
      currentIndex: index,
    };

    setExamSession(updatedSession);

    const question = examSession.questions[index];
    const answer = examSession.answers[question.id] || "";

    if (question.type === "mcq") {
      setSelectedAnswer(answer);
    } else {
      setVerbalAnswer(answer);
    }
  };

  const handleMarkForReview = () => {
    if (!examSession || !currentQuestion) return;

    const newMarkedForReview = { ...examSession.markedForReview };
    newMarkedForReview[currentQuestion.id] = !newMarkedForReview[currentQuestion.id];

    setExamSession({
      ...examSession,
      markedForReview: newMarkedForReview,
    });
  };

  const handleSubmitExam = () => {
    if (!examSession) return;
    
    // Save current answer before submitting
    const currentQuestion = examSession.questions[examSession.currentIndex];
    const answer = currentQuestion.type === 'mcq' ? selectedAnswer : verbalAnswer;
    const finalAnswers = { ...examSession.answers, [currentQuestion.id]: answer };
    
    submitExamMutation.mutate({
      sessionId: examSession.id,
      answers: finalAnswers,
      timeSpent: (examSession.duration * 60) - timeRemaining,
    });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const currentQuestion = examSession?.questions[examSession.currentIndex];
  const progress = examSession ? ((examSession.currentIndex + 1) / examSession.questions.length) * 100 : 0;

  const backLink = from || "/dashboard";

  if (showResults && examResults) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="text-center bg-white dark:bg-gray-800">
            <CardHeader>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
                <Award className="h-20 w-20 text-yellow-500 mx-auto" />
              </motion.div>
              <CardTitle className="text-3xl font-bold mt-4">Exam Completed!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-300">{examResults.score}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Correct</div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700/30 p-4 rounded-lg">
                    <div className="text-3xl font-bold">{examResults.totalQuestions}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-300">{examResults.percentage}%</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Score</div>
                  </div>
                </div>
              </motion.div>
              
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Button onClick={() => setShowResults(false)} className="mr-4">
                  Take Another Exam
                </Button>
                <Button variant="outline" asChild>
                  <Link href={backLink}>Back to {from ? "AI Tutor" : "Dashboard"}</Link>
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!examSession) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-8">
                    <Button variant="ghost" onClick={() => setLocation(backLink)}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to {from ? "AI Tutor" : "Dashboard"}
                    </Button>
                    <h1 className="text-4xl font-bold text-center">Practice Exams</h1>
                    <div className="w-24"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <Card className="bg-white dark:bg-gray-800">
                            <CardHeader>
                                <CardTitle className="flex items-center text-xl">
                                    <Target className="h-6 w-6 mr-3 text-primary" />
                                    Start New Exam
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {quizSubject !== "all" || quizUnit ? (
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                        <div className="text-center mb-4">
                                            <p className="text-lg font-semibold">Ready to quiz on:</p>
                                            <p className="text-xl font-bold text-primary">
                                                {quizSubject !== "all" && quizSubject ? quizSubject.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Any Subject'}
                                                {quizUnit && ` - ${quizUnit}`}
                                            </p>
                                        </div>
                                        <Button
                                            className="w-full h-32 flex flex-col items-center justify-center p-4 text-center text-lg font-bold"
                                            onClick={() => startExamMutation.mutate({
                                                subject: quizSubject,
                                                unit: quizUnit, // Pass the selected unit
                                                questionCount: 10,
                                                duration: 15,
                                                type: 'mixed'
                                            })}
                                            disabled={startExamMutation.isPending}
                                        >
                                            <BookOpen className="h-10 w-10 mb-2" />
                                            <span>Start Quiz</span>
                                            <span className="text-xs mt-1">10 Qs • 15 min</span>
                                        </Button>
                                    </motion.div>
                                ) : (
                                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                                        <p className="mb-2">No specific subject or unit selected from AI Tutor.</p>
                                        <p>Please select a subject and unit in the AI Tutor section to start a contextual quiz.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div>
                        <Card className="bg-white dark:bg-gray-800">
                            <CardHeader><CardTitle>Recent Exams</CardTitle></CardHeader>
                            <CardContent>
                                {Array.isArray(examHistory) && examHistory.length > 0 ? (
                                    <div className="space-y-3">
                                        {examHistory.slice(0, 5).map((exam: any, index: number) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                                                <div>
                                                    <div className="font-medium text-sm">{exam.subject}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{exam.date}</div>
                                                </div>
                                                <Badge variant={exam.score >= 70 ? "default" : "secondary"}>
                                                    {exam.score}%
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No exam history yet.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {/* Exam Header */}
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <Button variant="ghost" onClick={() => setLocation(backLink)}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <h1 className="text-2xl font-bold">Practice Exam: {currentQuestion?.subject}</h1>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center text-red-600 dark:text-red-400">
                            <Clock className="h-5 w-5 mr-2" />
                            <span className="font-mono text-lg">{formatTime(timeRemaining)}</span>
                        </div>
                        <Badge variant="outline" className="dark:border-gray-600">
                            Q {examSession.currentIndex + 1} / {examSession.questions.length}
                        </Badge>
                    </div>
                </div>
                <Progress value={progress} className="h-2 mb-6" />
            </div>

            {/* Question Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={examSession.currentIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-4xl mx-auto"
                >
                    <Card className="mb-6 bg-white dark:bg-gray-800">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Badge variant={currentQuestion?.difficulty === 'easy' ? 'success' : currentQuestion?.difficulty === 'medium' ? 'warning' : 'destructive'}>
                                        {currentQuestion?.difficulty}
                                    </Badge>
                                    <Badge variant="outline" className="dark:border-gray-600">{currentQuestion?.type.toUpperCase()}</Badge>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {/* TTS buttons */}
                                </div>
                            </div>
                        </CardHeader>
                        
                        <CardContent>
                            <p className="text-lg font-medium mb-6 min-h-[60px]">{currentQuestion?.text}</p>
                            
                            {currentQuestion?.type === 'mcq' && currentQuestion.options ? (
                                <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                                    <div className="space-y-3">
                                        {currentQuestion.options.map((option, index) => (
                                            <Label key={index} htmlFor={`option-${index}`} className={cn("flex items-center space-x-3 p-4 border rounded-lg transition-all cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50", selectedAnswer === option && "bg-blue-50 dark:bg-blue-900/30 border-blue-500")}>
                                                <RadioGroupItem value={option} id={`option-${index}`} />
                                                <span className="flex-1">{option}</span>
                                            </Label>
                                        ))}
                                    </div>
                                </RadioGroup>
                            ) : (
                              <div> {/* Placeholder for verbal answer */} </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between max-w-4xl mx-auto">
                <Button variant="outline" onClick={handlePreviousQuestion} disabled={examSession.currentIndex === 0}>
                    Previous
                </Button>
                
                <div className="flex space-x-3">
                    <Button
                        variant="outline"
                        onClick={handleMarkForReview}
                        className={cn("flex items-center space-x-2", currentQuestion && examSession.markedForReview[currentQuestion.id] && "bg-yellow-200 text-yellow-800 border-yellow-300 dark:bg-yellow-800/30 dark:text-yellow-300 dark:border-yellow-700")}
                    >
                        <Bookmark className="h-4 w-4" />
                        <span>{currentQuestion && examSession.markedForReview[currentQuestion.id] ? "Marked" : "Mark"}</span>
                    </Button>
                    {examSession.currentIndex < examSession.questions.length - 1 ? (
                        <Button onClick={handleNextQuestion}>
                            Next Question
                        </Button>
                    ) : (
                        <Button onClick={handleSubmitExam} disabled={submitExamMutation.isPending} className="bg-green-600 hover:bg-green-700">
                            {submitExamMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Submit Exam
                        </Button>
                    )}
                </div>
            </div>
        </main>
        <aside className="hidden w-1/4 min-w-[280px] border-l dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto p-4 lg:block">
            <QuizSidebar
                questions={examSession.questions}
                currentIndex={examSession.currentIndex}
                answers={examSession.answers}
                markedForReview={examSession.markedForReview}
                onQuestionSelect={handleQuestionSelect}
            />
        </aside>
      </div>
  );
}