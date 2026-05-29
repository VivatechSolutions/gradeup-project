import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockExamQuestions, Question } from '../lib/mock-exam-data';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { AlertTriangle, Check, ChevronsRight, Eye, EyeOff, Mic, MicOff, Timer as TimerIcon, Zap, BrainCircuit, PencilRuler, HelpCircle, Star, Moon, Sun, GripVertical, LayoutGrid, Sparkles } from 'lucide-react';
import ExamResultDisplay from '../components/exam-result-display';
import { useTheme } from '../hooks/use-theme';
import { useMediaQuery } from '../hooks/use-media-query';
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '../components/ui/drawer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import FunnyLoader from '../components/ui/FunnyLoader';
import MotionDetector from '../components/MotionDetector';
import { useAuth } from '../hooks/use-auth';
import Navigation from '../components/navigation';



const SystemCheck = ({ onComplete }: { onComplete: () => void }) => {
    const [step, setStep] = useState('welcome'); // welcome, mic, webcam, ready
    const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
    const [webcamPermission, setWebcamPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [loading, setLoading] = useState(false);
  const { userHeader } = useAuth();
  
    const [currentRole, setCurrentRole] = useState("student");
  
    useEffect(() => {
      if (userHeader?.role) {
        setCurrentRole(userHeader.role);
      }
    }, [userHeader]);

    const handleRoleChange = (newRole: string) => {
    setCurrentRole(newRole);
  };
    const requestMicPermission = async () => {
      setLoading(true);
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicPermission('granted');
        setTimeout(() => {
            setLoading(false);
            setStep('webcam');
        }, 1500);
      } catch (error) {
        setMicPermission('denied');
        setLoading(false);
      }
    };
  
    const requestWebcamPermission = async () => {
      setLoading(true);
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setWebcamPermission('granted');
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setTimeout(() => {
            setLoading(false);
            setStep('ready');
        }, 1500);
      } catch (error) {
        setWebcamPermission('denied');
        setLoading(false);
      }
    };
    
    useEffect(() => {
      if (stream && videoRef.current) {
          videoRef.current.srcObject = stream;
      }
      return () => {
          if (stream) {
              stream.getTracks().forEach(track => track.stop());
          }
      }
    }, [stream]);
  
    const steps = {
      welcome: {
        icon: <Sparkles className="w-16 h-16 text-yellow-400" />,
        title: "Let's Get You Set Up!",
        description: "Before we start the exam, let's quickly check your system.",
        buttonText: "Start Checks",
        action: () => setStep('mic'),
        permission: 'prompt',
      },
      mic: {
        icon: <Mic className="w-16 h-16 text-blue-400" />,
        title: "Microphone Check",
        description: "We need to access your microphone for proctoring. Please allow access.",
        buttonText: "Grant Microphone Access",
        action: requestMicPermission,
        permission: micPermission,
      },
      webcam: {
        icon: <Eye className="w-16 h-16 text-green-400" />,
        title: "Webcam Check",
        description: "Next, let's check your webcam. You should see yourself below.",
        buttonText: "Grant Webcam Access",
        action: requestWebcamPermission,
        permission: webcamPermission,
      },
      ready: {
        icon: <Check className="w-16 h-16 text-green-500" />,
        title: "All Set!",
        description: "Your system is ready. Good luck on your exam!",
        buttonText: "Start Exam",
        action: onComplete,
        permission: 'granted',
      },
    };
  
    const currentStepData = steps[step as keyof typeof steps];
  
    if (loading) {
        return <FunnyLoader />;
    }

  
  return (
  <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 flex flex-col z-50">
    
    {/* ✅ HEADER */}
    <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow">
      <Navigation 
        currentRole={currentRole} 
        onRoleChange={handleRoleChange}
      />
    </div>

    {/* ✅ CONTENT */}
    <div className="flex-1 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="w-full max-w-md mx-auto"
        >
          <Card className="text-center shadow-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg">
            
            <CardHeader>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 1, ease: "easeInOut" }}
                className="w-24 h-24 mx-auto mb-4 flex items-center justify-center"
              >
                {currentStepData.icon}
              </motion.div>
              <CardTitle className="text-2xl font-bold">
                {currentStepData.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                {currentStepData.description}
              </p>

              {step === 'webcam' && (
                <div className="w-full aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {webcamPermission === 'denied' && (
                    <div className="absolute inset-0 flex items-center justify-center text-red-500 bg-black/50">
                      <p>Webcam access denied.</p>
                    </div>
                  )}
                  {webcamPermission === 'prompt' && !loading && (
                    <div className="absolute inset-0 flex items-center justify-center text-white bg-black/50">
                      <p>Waiting for webcam permission...</p>
                    </div>
                  )}
                </div>
              )}

              {currentStepData.permission === 'denied' && (
                <div className="text-red-500 font-semibold p-3 bg-red-500/10 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Permission was denied. Please enable it in browser settings.
                </div>
              )}

              {step !== 'ready' && currentStepData.permission !== 'denied' && (
                <Button size="lg" onClick={currentStepData.action} className="w-full text-lg">
                  {currentStepData.buttonText}
                </Button>
              )}

              {step === 'ready' && (
                <Button
                  size="lg"
                  onClick={onComplete}
                  className="w-full text-lg bg-green-600 hover:bg-green-700"
                >
                  {currentStepData.buttonText}
                </Button>
              )}
            </CardContent>

          </Card>
        </motion.div>
      </AnimatePresence>
    </div>

  </div>
);
};

const Webcam = ({ stream }: { stream: MediaStream | null }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="w-full h-full bg-gray-900/50 text-white flex items-center justify-center rounded-lg">
            {stream ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
                <p className="text-sm">Connecting to camera...</p>
            )}
        </div>
    );
};

const ExamStartingLoader = () => {
  const loaders = ["Charging brain cells...", "Compiling genius...", "Sharpening digital pencils...", "Consulting cosmic sages...", "Reticulating splines..."];
  const [currentLoader, setCurrentLoader] = useState(loaders[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLoader(loaders[Math.floor(Math.random() * loaders.length)]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-blue-900 flex flex-col items-center justify-center z-50 text-white">
      <Zap className="w-20 h-20 text-yellow-300 animate-pulse mb-6" />
      <p className="text-2xl font-bold">Preparing Your Challenge!</p>
      <AnimatePresence mode="wait">
        <motion.p key={currentLoader} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-blue-300 mt-2">
          {currentLoader}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

const initialTime = 30 * 60;

const ProctoringView = ({ isMobile, stream }: { isMobile: boolean, stream: MediaStream | null }) => {
    const constraintsRef = useRef(null);

    if (isMobile) {
        return (
            <motion.div ref={constraintsRef} className="fixed inset-0 pointer-events-none w-full h-full z-50">
                <motion.div
                    drag
                    dragConstraints={constraintsRef}
                    dragMomentum={false}
                    className="fixed top-4 right-4 z-50 pointer-events-auto"
                >
                    <Card className="w-40 sm:w-48 shadow-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200 dark:border-gray-700">
                        <CardHeader className="p-2 cursor-move flex-row items-center justify-center space-x-2">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                            <CardTitle className="text-xs flex items-center justify-between w-full">
                                Proctoring
                                <div className="flex items-center gap-1 text-green-500">
                                    <Eye className="w-4 h-4" />
                                    <Mic className="w-4 h-4" />
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-1 relative">
                            <div className="aspect-video bg-gray-800/80 rounded-md overflow-hidden border dark:border-gray-700">
                                <Webcam stream={stream} />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
        );
    }

    // Desktop view
    return (
        <Card className="shadow-lg relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                    AI Proctoring
                    <div className="flex items-center gap-2 text-green-500">
                        <Eye className="w-5 h-5" />
                        <Mic className="w-5 h-5" />
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="aspect-video bg-gray-800/80 rounded-lg overflow-hidden border dark:border-gray-700">
                    <Webcam stream={stream} />
                </div>
            </CardContent>
        </Card>
    );
};

const PreparationExamPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [systemCheckPassed, setSystemCheckPassed] = useState(false);
  const [questions] = useState<Question[]>(() => [...mockExamQuestions].sort(() => Math.random() - 0.5));
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  const [statuses, setStatuses] = useState<Record<number, 'answered' | 'unanswered' | 'review'>>({});
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [proctoringAlert, setProctoringAlert] = useState<string | null>(null);
  const [isAlertCooldown, setIsAlertCooldown] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const { theme, setTheme } = useTheme();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Speech Recognition States
  const [isListening, setIsListening] = useState(false);
  const [spokenAnswer, setSpokenAnswer] = useState<string>('');
  const recognitionRef = useRef<any>(null); // Ref for speech recognition object


  const stopStreams = () => {
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
    setWebcamStream(null);
  };

  const resetState = () => {
    setIsLoading(true);
    setIsSubmitted(false);
    setSystemCheckPassed(false);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setStatuses({});
    setTimeLeft(initialTime);
    stopStreams();
    setTimeout(() => setIsLoading(false), 2000);
  };

  // Speech Recognition Functions
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsListening(true);
      setSpokenAnswer(''); // Clear previous spoken answer
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US'; // Default language

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSpokenAnswer(transcript);
        // Automatically set answer for the current question
        handleAnswerChange(questions[currentQuestionIndex].id, transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [questions, currentQuestionIndex]); // Re-initialize if questions or currentQuestionIndex changes
  
  const handleSystemCheckComplete = () => {
      setSystemCheckPassed(true);
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 2500);
  }

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 1000); // Initial load for system check
  }, []);

  useEffect(() => {
    if (systemCheckPassed && !isSubmitted) {
        const startStreams = async () => {
            try {
                const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                mediaStreamRef.current = media;
                setWebcamStream(media);
            } catch (error) {
                console.error("Error starting streams:", error);
            }
        };
        startStreams();
    } else {
        stopStreams();
    }
}, [systemCheckPassed, isSubmitted]);

  useEffect(() => {
    return () => {
        stopStreams();
    }
  }, []);

    useEffect(() => {

      if (isLoading || isSubmitted || !systemCheckPassed) return;

      const timer = setInterval(() => {

        setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));

      }, 1000);

      return () => clearInterval(timer);

    }, [isLoading, isSubmitted, systemCheckPassed]);

  

    const handleMotion = () => {
      if (proctoringAlert || isAlertCooldown) return;
    setProctoringAlert("Potential misconduct detected: Unusual movement. A warning has been logged.");
  };

  const handleAlertDismiss = () => {
    setProctoringAlert(null);
    setIsAlertCooldown(true);
    setTimeout(() => {
        setIsAlertCooldown(false);
    }, 30000); // 30 second cooldown
  };

  

    const handleAnswerChange = (questionId: number, value: string | number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (statuses[questionId] !== 'answered') {
       setStatuses(prev => ({ ...prev, [questionId]: 'answered' }));
    }
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const markForReview = () => {
    setStatuses(prev => ({ ...prev, [questions[currentQuestionIndex].id]: 'review' }));
    if (currentQuestionIndex < questions.length - 1) {
        goToQuestion(currentQuestionIndex + 1);
    }
  };

  const handleSubmit = () => {
    let correctAnswers = 0;
    questions.forEach(q => {
        if (q.type === 'MCQ') {
            const correctAnswerIndex = q.answer;
            const userAnswerIndex = Number(answers[q.id]);
            if (userAnswerIndex === correctAnswerIndex) {
                correctAnswers++;
            }
        } else {
            if (answers[q.id] && String(answers[q.id]).trim() !== '') {
                correctAnswers++;
            }
        }
    });
    setScore(correctAnswers);
    setIsSubmitted(true);
    stopStreams();
  }
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionIcon = (type: Question['type']) => {
    switch (type) {
        case 'MCQ': return <HelpCircle className="w-5 h-5 mr-2 text-blue-400" />;
        case 'SHORT': return <PencilRuler className="w-5 h-5 mr-2 text-orange-400" />;
        case 'LONG': return <BrainCircuit className="w-5 h-5 mr-2 text-purple-400" />;
        case 'SPEECH': return <Mic className="w-5 h-5 mr-2 text-green-400" />; // Added SPEECH type
        default: return null;
    }
  }

  if (isLoading) return <ExamStartingLoader />;
  if (!systemCheckPassed) return <SystemCheck onComplete={handleSystemCheckComplete} />;
  if (isSubmitted) return <ExamResultDisplay score={score} total={questions.length} isMainExam={false} onRetry={resetState} />;

  const currentQuestion = questions[currentQuestionIndex];
  
  const QuestionPaletteContent = () => (
    <>
      <CardHeader className="pb-2"><CardTitle className="text-base">Question Palette</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-5 gap-2">
        {questions.map((q, index) => {
          const status = statuses[q.id];
          const isCurrent = index === currentQuestionIndex;
          let bgColor = 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600';
          if (isCurrent) bgColor = 'bg-blue-500 text-white ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-900';
          else if (status === 'answered') bgColor = 'bg-green-500/80 text-white';
          else if (status === 'review') bgColor = 'bg-yellow-500/80 text-black';
          
          return (
            <motion.button whileHover={{ scale: 1.15, y: -2 }} whileTap={{ scale: 0.95 }} key={q.id} onClick={() => goToQuestion(index)}
              className={`w-10 h-10 flex items-center justify-center rounded-md font-semibold text-sm transition-colors ${bgColor}`}>
              {index + 1}
            </motion.button>
          );
        })}
      </CardContent>
      <CardContent className="pt-4 border-t border-gray-200 dark:border-gray-800 mt-4">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500/80"></div><span>Answered</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500/80"></div><span>Review</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700"></div><span>Unanswered</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span>Current</span></div>
          </div>
      </CardContent>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 font-sans transition-colors duration-500">
    
      {/* {webcamStream && <MotionDetector stream={webcamStream} onMotion={handleMotion} />}
      <AlertDialog open={!!proctoringAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="w-6 h-6 text-red-500" /> Proctoring Alert</AlertDialogTitle>
            <AlertDialogDescription>{proctoringAlert} Please adhere to the examination rules. Repeated warnings may lead to disqualification.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogAction onClick={handleAlertDismiss}>I Understand</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-400/20 via-transparent to-purple-400/20 dark:from-blue-900/30 dark:to-purple-900/30 -z-10 animate-gradient-xy"></div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-12 gap-6 max-w-screen-2xl mx-auto"
      >
        <div className="col-span-12 lg:col-span-9">
          <Card className="shadow-xl border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between pb-2">
              <CardTitle className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500 mb-4 sm:mb-0">
                Practice Arena
              </CardTitle>
              <div className="flex items-center gap-2 md:gap-4">
                <div className="flex items-center gap-2 md:gap-4 bg-gray-200/50 dark:bg-gray-800/50 px-3 py-1.5 md:px-4 md:py-2 rounded-lg">
                    <TimerIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-500 animate-pulse" />
                    <span className="text-xl md:text-2xl font-mono font-bold">{formatTime(timeLeft)}</span>
                </div>
                <Button variant="outline" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                >
                  <h2 className="text-md md:text-lg font-semibold mb-4 flex items-center">
                    {getQuestionIcon(currentQuestion.type)}
                    Question {currentQuestionIndex + 1}/{questions.length}
                  </h2>
                  <p className="text-lg md:text-xl mb-6">{currentQuestion.question}</p>

                  {currentQuestion.type === 'MCQ' && currentQuestion.options && (
                    <RadioGroup value={String(answers[currentQuestion.id] || '')} onValueChange={(value) => handleAnswerChange(currentQuestion.id, parseInt(value))}>
                      {currentQuestion.options.map((option, index) => (
                        <motion.div key={index} whileHover={{x: 5}} className="flex items-center space-x-3 mb-3 p-3 rounded-lg hover:bg-blue-500/10 dark:hover:bg-blue-500/20 transition-colors cursor-pointer border border-transparent has-[:checked]:border-blue-500">
                          <RadioGroupItem value={String(index)} id={`q${currentQuestion.id}-o${index}`} />
                          <Label htmlFor={`q${currentQuestion.id}-o${index}`} className="flex-1 cursor-pointer text-base">{option}</Label>
                        </motion.div>
                      ))}
                    </RadioGroup>
                  )}
                  {currentQuestion.type === 'SPEECH' && (
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Speak your answer here..."
                        value={spokenAnswer || String(answers[currentQuestion.id] || '')}
                        readOnly
                        className="min-h-[150px] text-base p-4 border-2 border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800/50"
                      />
                      <div className="flex justify-center">
                        <Button
                          onClick={isListening ? stopListening : startListening}
                          className={`w-full max-w-sm py-3 text-lg font-bold ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                        >
                          {isListening ? (
                            <>
                              <MicOff className="w-5 h-5 mr-2" /> Stop Speaking
                            </>
                          ) : (
                            <>
                              <Mic className="w-5 h-5 mr-2" /> Start Speaking
                            </>
                          )}
                        </Button>
                      </div>
                      {isListening && (
                        <p className="text-center text-sm text-blue-500">Listening... Speak clearly now.</p>
                      )}
                    </div>
                  )}
                  {(currentQuestion.type === 'SHORT' || currentQuestion.type === 'LONG') && (
                    <Textarea
                      placeholder={`Your ${currentQuestion.type === 'SHORT' ? 'brief' : 'detailed'} answer...`}
                      value={String(answers[currentQuestion.id] || '')}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      className={`min-h-[${currentQuestion.type === 'SHORT' ? '120px' : '200px'}] bg-transparent dark:bg-gray-800/50 text-base`}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
              <div className="flex flex-col sm:flex-row justify-between items-center mt-8 border-t border-gray-200 dark:border-gray-700 pt-6 gap-4">
                <Button variant="outline" onClick={() => goToQuestion(currentQuestionIndex - 1)} disabled={currentQuestionIndex === 0}>
                  Previous
                </Button>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button variant="ghost" className="w-full" onClick={markForReview}>
                    <Star className="w-4 h-4 mr-2 text-yellow-400"/>
                    Mark for Review & Next
                  </Button>
                  <Button className="w-full" onClick={() => { if(currentQuestionIndex < questions.length -1) goToQuestion(currentQuestionIndex + 1)}}>
                    Save & Next <ChevronsRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-12 lg:col-span-3 lg:space-y-6">
            {isDesktop ? (
                <>
                    <ProctoringView isMobile={false} stream={webcamStream} />
                    <Card className="shadow-lg bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
                        <QuestionPaletteContent />
                    </Card>
                    <Button size="lg" className="w-full text-lg font-bold bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white" onClick={handleSubmit}>
                        Submit & See Score <Check className="w-5 h-5 ml-2"/>
                    </Button>
                </>
            ) : (
                <>
                    <ProctoringView isMobile={true} stream={webcamStream} />
                     <div className="fixed bottom-4 right-4 z-40">
                        <Drawer>
                            <DrawerTrigger asChild>
                                <Button variant="secondary" size="icon" className="rounded-full h-14 w-14 shadow-lg">
                                    <LayoutGrid className="w-6 h-6" />
                                </Button>
                            </DrawerTrigger>
                            <DrawerContent>
                                <div className="mx-auto w-full max-w-sm md:max-w-md lg:max-w-lg">
                                    <DrawerHeader>
                                        <DrawerTitle>Question Palette</DrawerTitle>
                                    </DrawerHeader>
                                    <div className="p-4">
                                        <Card className="border-none shadow-none"><QuestionPaletteContent/></Card>
                                    </div>
                                    <DrawerFooter>
                                        <DrawerClose asChild><Button variant="outline">Close</Button></DrawerClose>
                                    </DrawerFooter>
                                </div>
                            </DrawerContent>
                        </Drawer>
                    </div>
                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-8">
                         <Button size="lg" className="w-full text-lg font-bold bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white shadow-lg" onClick={handleSubmit}>
                            Submit Test
                        </Button>
                    </div>
                </>
            )}
        </div>
      </motion.div>
    </div>
  );
};

export default PreparationExamPage;