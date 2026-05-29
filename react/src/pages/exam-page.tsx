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
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "../components/ui/dialog";
import { Link, useNavigate } from "wouter";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "../components/ui/dialog";
import { cn } from "../lib/utils";
import { apiRequest, queryClient } from "../lib/queryClient";
import Navigation from "../components/navigation";
import { useToast } from "../hooks/use-toast";

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
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

interface ExamSession {
  id: string;
  questions: Question[];
  currentIndex: number;
  answers: Record<number, string>;
  startTime: Date;
  duration: number; // in minutes
  isActive: boolean;
}

export default function ExamPage() {
  const { user } = useAuth();
  const { toast } = useToast();
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
    mutationFn: async (config: { subject: string; questionCount: number; duration: number; type: string }) => {
      const res = await apiRequest("POST", "/api/exam/start", config);
      return await res.json();
    },
    onSuccess: (data) => {
      setExamSession(data);
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
      const res = await apiRequest("POST", "/api/exam/submit", examData);
      return await res.json();
    },
    onSuccess: (results) => {
      setExamResults(results);
      setShowResults(true);
      setExamSession(null);
      queryClient.invalidateQueries({ queryKey: ["/api/student/exam-history"] });
      
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

  const navigate = useNavigate();

  if (examSession && showResults && examResults) {
    return (
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center">Exam Completed!</DialogTitle>
            <DialogDescription className="text-center">
              Congratulations on completing your exam! Here are your results.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <Award className="h-16 w-16 text-yellow-500" />
          </div>
          <div className="grid grid-cols-1 gap-4 text-center">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{examResults.score}</div>
              <div className="text-sm text-gray-600">Correct Answers</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{examResults.totalQuestions}</div>
              <div className="text-sm text-gray-600">Total Questions</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{examResults.percentage}%</div>
              <div className="text-sm text-gray-600">Score Percentage</div>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 pt-4">
            <Button onClick={() => setShowResults(false)} className="w-full">
              Take Another Exam
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowResults(false);
                navigate("/ai-tutor");
              }} 
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to AI Tutor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (!examSession) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation currentRole={user?.role || "student"} onRoleChange={() => {}} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Link href="/ai-tutor">
                <Button variant="outline" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="w-32"></div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Practice Exams</h1>
            <p className="text-gray-600">Test your knowledge with interactive MCQ and verbal exams</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Exam Configuration */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Start New Exam
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableSubjects.map((subject: any) => (
                      <Button
                        key={subject.id}
                        variant="outline"
                        className="h-24 flex flex-col items-center justify-center p-4 hover:bg-primary/5 hover:border-primary transition-colors"
                        onClick={() => startExamMutation.mutate({
                          subject: subject.name,
                          questionCount: 10,
                          duration: 15,
                          type: 'mixed'
                        })}
                        disabled={startExamMutation.isPending}
                      >
                        <BookOpen className="h-8 w-8 mb-2 text-primary" />
                        <span className="font-medium">{subject.name}</span>
                        <span className="text-xs text-gray-500">{subject.description}</span>
                        <span className="text-xs text-gray-400 mt-1">10 Questions • 15 min</span>
                      </Button>
                    ))}
                  </div>
                  
                  <div className="border-t pt-6">
                    <h3 className="font-medium mb-4">Exam Settings</h3>
                    <div className="flex items-center space-x-4">
                      <Label className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          checked={autoPlay} 
                          onChange={(e) => setAutoPlay(e.target.checked)}
                          className="rounded"
                        />
                        <span>Auto-play questions (TTS)</span>
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Exam History */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Recent Exams</CardTitle>
                </CardHeader>
                <CardContent>
                  {Array.isArray(examHistory) && examHistory.length > 0 ? (
                    <div className="space-y-3">
                      {examHistory.slice(0, 5).map((exam: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{exam.subject}</div>
                            <div className="text-xs text-gray-500">{exam.date}</div>
                          </div>
                          <Badge variant={exam.score >= 70 ? "default" : "secondary"}>
                            {exam.score}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No exam history yet. Start your first exam to see results here.
                    </p>
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
    <div className="min-h-screen bg-gray-50">
      <Navigation currentRole={user?.role || "student"} onRoleChange={() => {}} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Exam Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Practice Exam</h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-red-600">
                <Clock className="h-5 w-5 mr-2" />
                <span className="font-mono text-lg">{formatTime(timeRemaining)}</span>
              </div>
              <Badge variant="outline">
                Question {examSession.currentIndex + 1} of {examSession.questions.length}
              </Badge>
            </div>
          </div>
          
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge variant={currentQuestion?.difficulty === 'easy' ? 'default' : 
                              currentQuestion?.difficulty === 'medium' ? 'secondary' : 'destructive'}>
                  {currentQuestion?.difficulty}
                </Badge>
                <Badge variant="outline">{currentQuestion?.subject}</Badge>
                <Badge variant="outline">{currentQuestion?.type.toUpperCase()}</Badge>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => currentQuestion && speakText(currentQuestion.text)}
                  disabled={isSpeaking}
                >
                  {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                
                {isSpeaking && (
                  <Button variant="ghost" size="sm" onClick={stopSpeaking}>
                    <Square className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="text-lg font-medium mb-6">
              {currentQuestion?.text}
            </div>
            
            {currentQuestion?.type === 'mcq' && currentQuestion.options ? (
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Button
                    variant={isRecording ? "destructive" : "outline"}
                    onClick={isRecording ? stopRecording : startRecording}
                    className="flex items-center space-x-2"
                  >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    <span>{isRecording ? "Stop Recording" : "Record Answer"}</span>
                  </Button>
                  
                  {verbalAnswer && (
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>Voice Recorded</span>
                    </Badge>
                  )}
                </div>
                
                <Textarea
                  value={verbalAnswer}
                  onChange={(e) => setVerbalAnswer(e.target.value)}
                  placeholder="Type your answer here or use voice recording..."
                  className="min-h-[120px]"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePreviousQuestion}
            disabled={examSession.currentIndex === 0}
          >
            Previous
          </Button>
          
          <div className="flex space-x-3">
            {examSession.currentIndex < examSession.questions.length - 1 ? (
              <Button
                onClick={handleNextQuestion}
                disabled={!selectedAnswer && !verbalAnswer}
              >
                Next Question
              </Button>
            ) : (
              <Button
                onClick={handleSubmitExam}
                disabled={(!selectedAnswer && !verbalAnswer) || submitExamMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {submitExamMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Submit Exam
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}