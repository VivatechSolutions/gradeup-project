import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Slider } from "../components/ui/slider";
import { 
  ArrowLeft,
  Play,
  Pause,
  CheckCircle,
  Clock,
  FileText,
  Video,
  BookOpen,
  Trophy,
  Target,
  Volume2,
  VolumeX,
  Settings
} from "lucide-react";
import { apiRequest, queryClient } from "../lib/queryClient";
import Navigation from "../components/navigation";
import { useToast } from "../hooks/use-toast";

interface Lesson {
  id: number;
  title: string;
  content: string;
  courseId: number;
  orderIndex: number;
  duration: number;
  videoUrl?: string;
  createdAt: string;
}

interface Course {
  id: number;
  title: string;
  description: string;
  grade: number;
  subjectId: number;
}

export default function CourseLessonsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/courses/:courseId");
  const courseId = params?.courseId ? parseInt(params.courseId) : null;
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [showSpeechSettings, setShowSpeechSettings] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const { data: course } = useQuery<Course>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const { data: lessons = [], isLoading } = useQuery<Lesson[]>({
    queryKey: [`/api/courses/${courseId}/lessons`],
    enabled: !!courseId,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["/api/student/progress"],
    enabled: user?.role === "student",
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ lessonId, completed }: { lessonId: number; completed: boolean }) => {
      const res = await apiRequest("POST", "/api/progress", {
        lessonId,
        completed,
        timeSpent: 300 // 5 minutes default
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/progress"] });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/lessons`] });
      toast({
        title: "Progress Updated",
        description: "Your learning progress has been saved!",
      });
    },
  });

  const getCompletedLessons = () => {
    if (!Array.isArray(progress)) return new Set();
    return new Set(progress.filter((p: any) => p.completed).map((p: any) => p.lessonId));
  };

  const completedLessons = getCompletedLessons();
  const completionRate = lessons.length > 0 ? (completedLessons.size / lessons.length) * 100 : 0;

  const getLessonIcon = (lesson: Lesson | null) => {
    if (!lesson) return BookOpen;
    if (lesson.videoUrl) return Video;
    if (lesson.title.toLowerCase().includes('quiz')) return Target;
    if (lesson.title.toLowerCase().includes('assignment')) return FileText;
    return BookOpen;
  };

  const markLessonComplete = (lessonId: number) => {
    updateProgressMutation.mutate({ lessonId, completed: true });
  };

  const startLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setIsVideoPlaying(false);
    // Auto-scroll to content area on mobile
    const contentArea = document.querySelector('.lesson-content');
    if (contentArea && window.innerWidth < 1024) {
      contentArea.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleVideoPlayback = () => {
    setIsVideoPlaying(!isVideoPlaying);
    toast({
      title: isVideoPlaying ? "Video Paused" : "Video Playing",
      description: isVideoPlaying ? "Video has been paused" : "Video is now playing",
    });
  };

  // Text-to-Speech functionality
  const loadVoices = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      // Set default voice (prefer English voices)
      if (!selectedVoice && voices.length > 0) {
        const englishVoice = voices.find(voice => 
          voice.lang.startsWith('en') && voice.name.includes('Google')
        ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
        setSelectedVoice(englishVoice.name);
      }
    }
  };

  // Load voices when component mounts and when voices change
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  const getAvailableVoices = () => {
    return availableVoices;
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      toast({
        title: "Speech Not Supported",
        description: "Your browser doesn't support text-to-speech functionality.",
        variant: "destructive",
      });
      return;
    }

    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice settings
    const voices = getAvailableVoices();
    if (selectedVoice && voices.length > 0) {
      const voice = voices.find(v => v.name === selectedVoice) || voices[0];
      utterance.voice = voice;
    }
    
    utterance.rate = speechRate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      toast({
        title: "Speech Error",
        description: "There was an error with text-to-speech playback.",
        variant: "destructive",
      });
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const speakLessonContent = () => {
    if (!selectedLesson) return;
    
    let textToSpeak = `Lesson: ${selectedLesson.title}. `;
    
    if (selectedLesson.content) {
      // Clean up HTML content for speech
      const cleanText = selectedLesson.content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      textToSpeak += cleanText;
    } else {
      // Use default content structure
      textToSpeak += `This lesson covers important concepts related to ${selectedLesson.title.toLowerCase()}. 
        Students will learn fundamental principles and practical applications. 
        Learning objectives include: Understanding core concepts, applying knowledge to real-world scenarios, 
        developing problem-solving skills, and building foundation for advanced topics.`;
    }

    speakText(textToSpeak);
  };

  if (!match || !courseId) {
    return <div>Course not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="mb-4 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={() => setLocation("/courses")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
          
          {course && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{course.title}</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{course.description}</p>
              
              <div className="flex items-center space-x-4 mb-6">
                <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-400">Grade {course.grade}</Badge>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Trophy className="h-4 w-4 mr-1" />
                  {Math.round(completionRate)}% Complete
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4 mr-1" />
                  {lessons.length} Lessons
                </div>
              </div>
              
              <Progress value={completionRate} className="h-3 mb-8" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lessons List */}
          <div className="lg:col-span-1">
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="dark:text-white">Course Lessons</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y dark:divide-gray-700">
                  {isLoading ? (
                    <div className="p-4">
                      <div className="animate-pulse space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        ))}
                      </div>
                    </div>
                  ) : lessons.length > 0 ? (
                    lessons.map((lesson) => {
                      const IconComponent = getLessonIcon(lesson);
                      const isCompleted = completedLessons.has(lesson.id);
                      const isSelected = selectedLesson?.id === lesson.id;
                      const lessonType = lesson.videoUrl ? 'video' : 
                        lesson.title.toLowerCase().includes('quiz') ? 'quiz' : 'reading';
                      
                      return (
                        <div
                          key={lesson.id}
                          className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                            isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' : ''
                          }`}
                          onClick={() => startLesson(lesson)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${
                              isCompleted ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {isCompleted ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <IconComponent className="h-4 w-4" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-sm dark:text-white">{lesson.title}</h4>
                              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-400">
                                  {lessonType}
                                </Badge>
                                <span>{lesson.duration} min</span>
                              </div>
                            </div>
                            {!isCompleted && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startLesson(lesson);
                                }}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No lessons available yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lesson Content */}
          <div className="lg:col-span-2 lesson-content">
            {selectedLesson ? (
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="dark:text-white">{selectedLesson.title}</CardTitle>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-400">
                          {selectedLesson.videoUrl ? 'Video' : 
                           selectedLesson.title.toLowerCase().includes('quiz') ? 'Quiz' : 'Reading'}
                        </Badge>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{selectedLesson.duration} min</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Speech Controls */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={isSpeaking ? stopSpeech : speakLessonContent}
                        className="flex items-center space-x-2 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                      >
                        {isSpeaking ? (
                          <>
                            <VolumeX className="h-4 w-4" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-4 w-4" />
                            <span>Listen</span>
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowSpeechSettings(!showSpeechSettings)}
                        className="flex items-center space-x-1 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>

                      {user?.role === "student" && !completedLessons.has(selectedLesson.id) && (
                        <Button 
                          onClick={() => markLessonComplete(selectedLesson.id)}
                          disabled={updateProgressMutation.isPending}
                        >
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Speech Settings Panel */}
                  {showSpeechSettings && (
                    <Card className="mb-4 bg-gray-50 dark:bg-gray-700/50">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-3 dark:text-white">Voice Settings</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block dark:text-gray-300">Voice</label>
                            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                              <SelectTrigger className="w-full dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                                <SelectValue placeholder="Select a voice" />
                              </SelectTrigger>
                              <SelectContent className="dark:bg-gray-700 dark:text-gray-300">
                                {availableVoices.map((voice) => (
                                  <SelectItem key={voice.name} value={voice.name}>
                                    {voice.name} ({voice.lang})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium mb-2 block dark:text-gray-300">
                              Speed: {speechRate.toFixed(1)}x
                            </label>
                            <Slider
                              value={[speechRate]}
                              onValueChange={(value) => setSpeechRate(value[0])}
                              min={0.5}
                              max={2.0}
                              step={0.1}
                              className="w-full"
                            />
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => speakText("This is a test of the selected voice and speed settings.")}
                              disabled={isSpeaking}
                              className="dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                            >
                              Test Voice
                            </Button>
                            {isSpeaking && (
                              <Button size="sm" variant="outline" onClick={stopSpeech} className="dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600">
                                Stop Test
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="prose dark:prose-invert max-w-none">
                    {selectedLesson.videoUrl && (
                      <div className="bg-black rounded-lg overflow-hidden mb-6 relative">
                        <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
                          {!isVideoPlaying && (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-center justify-center">
                              <Button
                                size="lg"
                                className="rounded-full w-20 h-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-2 border-white/30"
                                onClick={toggleVideoPlayback}
                              >
                                <Play className="h-10 w-10 text-white ml-1" />
                              </Button>
                            </div>
                          )}
                          
                          {isVideoPlaying ? (
                            <div className="w-full h-full bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center relative">
                              <div className="text-white text-center">
                                <div className="w-32 h-32 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                  <Video className="h-16 w-16 text-white animate-pulse" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">{selectedLesson.title}</h3>
                                <p className="text-white/80">Educational video content playing...</p>
                              </div>
                              
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-4 right-4 text-white hover:bg-white/20"
                                onClick={toggleVideoPlayback}
                              >
                                <Pause className="h-6 w-6" />
                              </Button>
                            </div>
                          ) : (
                            <div className="text-center text-white p-8">
                              <Video className="h-24 w-24 mx-auto mb-4 text-white/60" />
                              <h3 className="text-xl font-semibold mb-2">{selectedLesson.title}</h3>
                              <p className="text-white/80 mb-4">Duration: {selectedLesson.duration} minutes</p>
                              <p className="text-sm text-white/60">Click play button to start lesson</p>
                            </div>
                          )}
                        </div>
                        
                        {isVideoPlaying && (
                          <div className="bg-gray-800 p-4">
                            <div className="flex items-center space-x-4">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-white hover:bg-gray-700"
                                onClick={toggleVideoPlayback}
                              >
                                <Pause className="h-4 w-4 mr-2" />
                                Pause
                              </Button>
                              
                              <div className="flex-1">
                                <div className="w-full bg-gray-600 rounded-full h-1">
                                  <div 
                                    className="bg-blue-500 h-1 rounded-full transition-all duration-1000" 
                                    style={{ width: '35%' }}
                                  ></div>
                                </div>
                              </div>
                              
                              <span className="text-white text-sm">
                                {Math.floor(selectedLesson.duration * 0.35)}:{String(Math.floor((selectedLesson.duration * 0.35 % 1) * 60)).padStart(2, '0')} / {selectedLesson.duration}:00
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {selectedLesson.content || (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Lesson Overview</h3>
                          <p>This lesson covers important concepts related to {selectedLesson.title.toLowerCase()}. Students will learn fundamental principles and practical applications.</p>
                          
                          <h4 className="font-semibold">Learning Objectives:</h4>
                          <ul className="list-disc pl-6 space-y-1">
                            <li>Understand the core concepts</li>
                            <li>Apply knowledge to real-world scenarios</li>
                            <li>Develop problem-solving skills</li>
                            <li>Build foundation for advanced topics</li>
                          </ul>
                          
                          <h4 className="font-semibold">Key Topics:</h4>
                          <ul className="list-disc pl-6 space-y-1">
                            <li>Fundamental principles and definitions</li>
                            <li>Step-by-step methodologies</li>
                            <li>Practical examples and case studies</li>
                            <li>Common mistakes and how to avoid them</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-96 flex items-center justify-center bg-white dark:bg-gray-800">
                <CardContent className="text-center">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a Lesson</h3>
                  <p className="text-gray-600 dark:text-gray-400">Choose a lesson from the left to start learning</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
  );
}