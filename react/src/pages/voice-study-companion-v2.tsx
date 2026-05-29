import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Slider } from "../components/ui/slider";
import { Switch } from "../components/ui/switch";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { Progress } from "../components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../components/ui/dialog';
import { VoiceVisualizer } from 'react-voice-visualizer';
import {
  Mic,
  Settings,
  BookOpen,
  ClipboardList,
  Play,
  Download,
  HelpCircle,
  Trash2,
  Sparkles,
  Loader2,
  ArrowLeft,
  Volume2,
  Gauge,
  ToggleLeft,
  Mic2,
  Sun,
  Moon,
  Bot,
  Send
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "../hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from '../lib/utils';
import { useTheme } from '../hooks/use-theme';
import './voice-companion.css';

// Interfaces
interface StudySession {
  id: string;
  title: string;
  subject: string;
  duration: number;
  startTime: Date;
  notes: AudioNote[];
  completed: boolean;
}

interface AudioNote {
  id: string;
  timestamp: number;
  audioUrl: string;
  transcription: string;
  topic: string;
  duration: number;
}

const Orb = ({ isRecording, isListening, isLoading, onClick }) => {
    let state = "idle";
    if (isRecording) state = "recording";
    else if (isListening) state = "listening";
    else if (isLoading) state = "loading";
  
    return (
      <div className={`orb-container ${state}`} onClick={onClick}>
        <div className={cn(
            "orb backdrop-blur-md bg-card/20 border border-border",
        )}>
          <div className="orb-icon text-foreground">
            <Mic size={60} />
          </div>
          <div className={cn("waves", "border-primary/50")}></div>
           <div className={cn(
            "absolute inset-0 rounded-full bg-gradient-to-br from-primary to-secondary transition-opacity duration-500",
            {"opacity-0": state !== "idle"},
            {"opacity-100": state === "idle"}
            )} />
           <div className={cn(
            "absolute inset-0 rounded-full bg-gradient-to-br from-destructive to-red-700 transition-opacity duration-500",
            {"opacity-0": state !== "recording"},
            {"opacity-100": state === "recording"}
            )} />
           <div className={cn(
            "absolute inset-0 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 transition-opacity duration-500",
            {"opacity-0": state !== "listening"},
            {"opacity-100": state === "listening"}
            )} />
          <div className="particles">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="particle bg-primary" />
            ))}
          </div>
        </div>
      </div>
    );
};

const AIChatInterface = ({ aIMessages, onSendMessage, isPending }) => {
    const [message, setMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [aIMessages]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || isPending) return;
        onSendMessage(message);
        setMessage("");
    };

    return (
        <Card className="w-full max-w-2xl mx-auto h-[70vh] flex flex-col bg-card">
            <CardHeader>
                <CardTitle className="flex items-center"><Sparkles className="animate-pulse text-indigo-500" className="mr-2"/> AI Tutor</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
                 <ScrollArea className="h-full p-4">
                    <div className="space-y-4">
                        {aIMessages.map((msg, index) => (
                            <div key={index} className={cn("flex items-end gap-2", msg.type === 'user' ? "justify-end" : "justify-start")}>
                                {msg.type === 'ai' && <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Sparkles className="animate-pulse text-indigo-500" size={20}/></div>}
                                <div className={cn("max-w-md p-3 rounded-lg", msg.type === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                    <p className="text-sm">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {isPending && (
                            <div className="flex items-end gap-2 justify-start">
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Sparkles className="animate-pulse text-indigo-500" size={20}/></div>
                                <div className="bg-muted max-w-xs p-3 rounded-lg text-sm flex items-center">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Thinking...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                 </ScrollArea>
            </CardContent>
            <div className="border-t p-4">
                <form onSubmit={handleSubmit} className="flex space-x-2">
                    <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Ask about your study topic..."
                        className="flex-1 bg-input text-foreground"
                        disabled={isPending}
                    />
                    <Button type="submit" size="icon" disabled={!message.trim() || isPending}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </Card>
    );
};
  
export default function VoiceStudyCompanionV2() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
  // States
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechSpeed, setSpeechSpeed] = useState(1.0);
  const [voiceVolume, setVoiceVolume] = useState(0.8);
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [studyGoal, setStudyGoal] = useState<string>('');
  const [sessionDuration, setSessionDuration] = useState(30);
  const [audioNotes, setAudioNotes] = useState<AudioNote[]>([]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionSetup, setIsSessionSetup] = useState(false);
  const [sessionSummary, setSessionSummary] = useState('');
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [isAskAiOpen, setIsAskAiOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<AudioNote | null>(null);
  const [aiResponse, setAiResponse] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('What is the powerhouse of the cell?');
  const [currentAnswer, setCurrentAnswer] = useState('Mitochondria');
  const [showAnswer, setShowAnswer] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [aIMessages, setAIMessages] = useState<Array<{ type: 'user' | 'ai', content: string }>>([
      { type: 'ai', content: "Hello! Ask me anything about your study session." }
  ]);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  const aiChatMutation = useMutation({
    mutationFn: async (message: string) => {
        // Simulate API call
        return new Promise<string>((resolve) => {
            setTimeout(() => {
                const response = `This is a detailed answer to your question about "${message}".`;
                resolve(response);
            }, 1500);
        });
    },
    onSuccess: (data) => {
      setAIMessages(prev => [...prev, { type: 'ai', content: data }]);
    },
    onError: (error) => {
      setAIMessages(prev => [...prev, { type: 'ai', content: "Sorry, I couldn't process that request. Please try again." }]);
    }
  });

  const handleAiChatMessage = (message: string) => {
    setAIMessages(prev => [...prev, { type: 'user', content: message }]);
    aiChatMutation.mutate(message);
  }

  const aiMutation = useMutation({
    mutationFn: async ({ text, action }: { text: string; action: 'explain' | 'summarize' }) => {
        // Simulate API call
        return new Promise<string>((resolve) => {
            setTimeout(() => {
                const response = action === 'explain' 
                    ? `This is a detailed explanation of "${text}". The key concepts are broken down to aid understanding.`
                    : `This is a concise summary of "${text}". It captures the main points effectively.`;
                resolve(response);
            }, 1500);
        });
      // Real API call would look like this:
      // const res = await apiRequest("POST", "/api/ai/process-note", { text, action });
      // return await res.json().then(data => data.response);
    },
    onSuccess: (data) => {
      setAiResponse(data);
    },
    onError: (error) => {
      setAiResponse("Sorry, I couldn't process that request. Please try again.");
    }
  });

  useEffect(() => {
    const savedNotes = localStorage.getItem('study-session-notes-v2');
    if (savedNotes) {
      setAudioNotes(JSON.parse(savedNotes));
    }
  }, []);

  useEffect(() => {
    if (currentSession && !currentSession.completed) {
      sessionTimerRef.current = setInterval(() => {
        setTimeElapsed(prev => {
          const newTime = prev + 1;
          if (newTime >= sessionDuration * 60) endStudySession();
          return newTime;
        });
      }, 1000);
    }
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [currentSession, sessionDuration]);

  // Voice Commands
  const voiceCommands = [
    { command: "start recording", action: () => !isRecording && startRecording(), description: "Begin recording audio notes" },
    { command: "stop recording", action: () => isRecording && stopRecording(), description: "Stop recording audio notes" },
    { command: "end session", action: () => endStudySession(), description: "End the current study session" },
  ];

  const handleVoiceCommand = useCallback((transcript: string) => {
    const command = voiceCommands.find(cmd => transcript.toLowerCase().includes(cmd.command));
    if (command) {
      toast({ title: "Voice Command Executed", description: command.description });
      command.action();
    }
  }, [isRecording]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = selectedLanguage;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim();
        handleVoiceCommand(transcript);
      };

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };
      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (currentSession && !currentSession.completed) {
            startListening();
        }
      };
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event);
        setIsListening(false);
      };
    }
  }, [handleVoiceCommand, currentSession, selectedLanguage]);

  function startListening() {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch(e) {
        console.error("could not start listening", e);
      }
    }
  }

  function stopListening() {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }
  
  const speakText = async (text: string) => {
    if (!voiceEnabled) return;
    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = speechSpeed;
        utterance.volume = voiceVolume;
        utterance.lang = selectedLanguage;
        speechSynthesis.speak(utterance);
      }
    } catch (error) {
        console.error("Speech synthesis error", error);
    }
  };

  function startStudySession() {
    if (!selectedSubject || !studyGoal) {
      toast({ title: "Setup Required", description: "Please select a subject and set a study goal.", variant: "destructive" });
      return;
    }
    const session: StudySession = {
      id: Date.now().toString(),
      title: `${selectedSubject} Study Session`,
      subject: selectedSubject,
      duration: sessionDuration,
      startTime: new Date(),
      notes: [],
      completed: false
    };
    setCurrentSession(session);
    setTimeElapsed(0);
    setAudioNotes([]);
    setIsSessionSetup(true);
    speakText(`Starting ${sessionDuration} minute study session for ${selectedSubject}.`);
    if (voiceCommandsEnabled) {
      startListening();
    }
    toast({ title: "Study Session Started", description: `${sessionDuration} minutes • ${selectedSubject}` });
  }

  function endStudySession() {
    if (!currentSession) return;
    setCurrentSession(prev => prev ? { ...prev, completed: true } : null);
    stopRecording();
    stopListening();
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    speakText(`Study session completed.`);
    toast({ title: "Session Complete" });
    setIsSessionSetup(false);
    saveAudioNotes();
  }

  function saveAudioNotes() {
    if (audioNotes.length === 0) return;
    localStorage.setItem('study-session-notes-v2', JSON.stringify(audioNotes));
    toast({
      title: "Notes Saved",
      description: `${audioNotes.length} audio notes have been saved.`,
    });
  }

  async function startRecording() {
    if (!currentSession) {
      toast({ title: "No active session", description: "Please start a study session first.", variant: "destructive" });
      return;
    }
    if (isRecording) return;

    stopListening();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordingChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        setIsLoading(true);
        const audioBlob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const newNote: AudioNote = {
          id: Date.now().toString(),
          timestamp: timeElapsed,
          audioUrl,
          transcription: "Processing...",
          topic: "General",
          duration: 0
        };
        setAudioNotes(prev => [...prev, newNote]);
        
        setTimeout(() => {
            setAudioNotes(prev => prev.map(n => n.id === newNote.id ? {...n, transcription: "This is a dummy transcription of your brilliant idea."} : n));
            setIsLoading(false);
        }, 2000);
        stream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      };
      mediaRecorder.start();
      setIsRecording(true);
      speakText("Recording");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({ title: "Microphone Error", description: "Could not access microphone.", variant: "destructive" });
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (voiceCommandsEnabled) {
        startListening();
      }
    }
  }

  function deleteAudioNote(noteId: string) {
    setAudioNotes(prev => prev.filter(n => n.id !== noteId));
    toast({ title: "Note Deleted", description: "The audio note has been removed." });
  }

  function handleAiAction(note: AudioNote) {
    setSelectedNote(note);
    setAiResponse('');
    setIsAiDialogOpen(true);
  }

  function handleAiRequest(action: 'explain' | 'summarize') {
    if (!selectedNote) return;
    aiMutation.mutate({ text: selectedNote.transcription, action });
  }

  async function generateSummary() {
    if (audioNotes.length === 0) {
      toast({ title: "No notes to summarize", variant: "destructive" });
      return;
    }
    const fullText = audioNotes.map(note => note.transcription).join('\n\n');
    
    const summaryPromise = new Promise<string>((resolve, reject) => {
        setTimeout(() => {
            const response = `This is a great summary of all your ${audioNotes.length} notes. It seems you are focusing on important concepts.`;
            resolve(response);
        }, 2000);
    });

    toast({ title: "Generating AI Summary...", description: "Please wait a moment." });

    const summaryText = await summaryPromise;
    setSessionSummary(summaryText);
    setIsSummaryOpen(true);
    toast({ title: "Summary Generated", description: "Your session notes have been summarized by AI." });
  }

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  const sessionProgress = currentSession ? (timeElapsed / (sessionDuration * 60)) * 100 : 0;

  return (
    <div className={cn("voice-companion-v2 bg-background text-foreground w-full h-screen overflow-hidden", theme)}>
      <div className="absolute top-4 left-4 z-20">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </Button>
            </Link>
          </div>
      
      <main className="h-full pt-16">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 h-full">
          {/* Left Column */}
          <div className="col-span-1 md:col-span-1 lg:col-span-1 flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Session Control</span>
                  <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                    {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isSessionSetup ? (
                  <div className="space-y-4">
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
                      <SelectContent><SelectItem value="gen-sci">General Science</SelectItem><SelectItem value="history-101">History 101</SelectItem><SelectItem value="literature">Literature</SelectItem></SelectContent>
                    </Select>
                    <Select value={String(sessionDuration)} onValueChange={v => setSessionDuration(Number(v))}>
                      <SelectTrigger><SelectValue placeholder="Session duration" /></SelectTrigger>
                      <SelectContent><SelectItem value="15">15 mins</SelectItem><SelectItem value="30">30 mins</SelectItem><SelectItem value="60">60 mins</SelectItem></SelectContent>
                    </Select>
                    <Input value={studyGoal} onChange={e => setStudyGoal(e.target.value)} placeholder="What's your study goal?" />
                    <Button onClick={startStudySession} className="w-full" disabled={!selectedSubject || !studyGoal}>Start Session</Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="text-center">
                        <p className="text-lg font-semibold">{currentSession?.title}</p>
                        <p className="text-muted-foreground">{formatTime(timeElapsed)} / {sessionDuration}:00</p>
                    </div>
                    <Progress value={sessionProgress} className="w-full h-2" />
                    <Button onClick={endStudySession} variant="destructive" className="w-full">End Session</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button className="w-full" onClick={() => setIsAskAiOpen(true)}><Sparkles className="mr-2 h-5 w-5 animate-pulse text-indigo-500" /> Ask AI Assistant</Button>

            <Tabs defaultValue="notes" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="notes">Voice Notes</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="notes">
                    <Card>
                        <CardHeader><CardTitle>My Voice Notes</CardTitle></CardHeader>
                        <CardContent>
                            <ScrollArea className="h-48">
                            {audioNotes.length === 0 && <p className='text-center text-muted-foreground pt-10'>Record a voice note to see it here.</p>}
                            <AnimatePresence>
                              {audioNotes.map(note => (
                                <motion.div key={note.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                                            className="note-card border rounded-lg p-3 mb-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                          <Badge variant="secondary">{formatTime(note.timestamp)}</Badge>
                                          <p className="my-2 text-sm text-foreground">{note.transcription}</p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                          <Button size="icon" variant="ghost" onClick={() => {if(audioRef.current){audioRef.current.src=note.audioUrl; audioRef.current.play()}}}><Play className="h-4 w-4"/></Button>
                                          <Button size="icon" variant="ghost" className="text-primary" onClick={() => handleAiAction(note)}><Sparkles className="h-4 w-4"/></Button>
                                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteAudioNote(note.id)}><Trash2 className="h-4 w-4"/></Button>
                                        </div>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="settings">
                    <Card>
                        <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                                <div className='flex items-center gap-3 text-sm'><ToggleLeft className="w-5 h-5 text-muted-foreground" /><span>Voice Enabled</span></div>
                                <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} />
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                                 <div className='flex items-center gap-3 text-sm'><Mic2 className="w-5 h-5 text-muted-foreground" /><span>Voice Commands</span></div>
                                <Switch checked={voiceCommandsEnabled} onCheckedChange={setVoiceCommandsEnabled} />
                            </div>
                            <div className="p-2 rounded-lg hover:bg-muted/50 space-y-2">
                                <label className='text-sm flex items-center gap-3'><Gauge className="w-5 h-5 text-muted-foreground" />Language</label>
                                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="en-US">English (US)</SelectItem>
                                        <SelectItem value="en-GB">English (UK)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="p-2 rounded-lg hover:bg-muted/50 space-y-2">
                                <label className='text-sm flex items-center gap-3'><Gauge className="w-5 h-5 text-muted-foreground" />Speech Speed: <span className="font-bold">{speechSpeed.toFixed(1)}x</span></label>
                                <Slider value={[speechSpeed]} onValueChange={v => setSpeechSpeed(v[0])} min={0.5} max={2} step={0.1} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
          </div>

          {/* Right Column (Main Interaction Area) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center h-full">
            <AnimatePresence mode="wait">
            {!isSessionSetup ? (
                <motion.div key="setup" initial={{opacity: 0, scale: 0.9}} animate={{opacity: 1, scale: 1}} exit={{opacity: 0, scale: 0.9}} className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight">Ready to study?</h2>
                    <p className="text-muted-foreground mt-2">Configure your session on the left and press "Start Session".</p>
                    <div className="mt-8">
                        <BookOpen size={80} className="mx-auto text-primary/20"/>
                    </div>
                </motion.div>
            ) : (
                <motion.div key="session" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="flex flex-col items-center justify-center w-full h-full">
                    
                    {isRecording && audioStream ? (
                        <VoiceVisualizer mediaStream={audioStream} />
                    ) : (
                        <Orb isRecording={isRecording} isListening={isListening} isLoading={isLoading} onClick={isRecording ? stopRecording : startRecording} />
                    )}
                    
                    <div className='session-status text-muted-foreground mt-8 text-center'>
                        <AnimatePresence mode="wait">
                            <motion.p key={isRecording ? 'rec' : 'idle'} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
                                {isRecording ? "Recording your brilliant thoughts..." : (isListening ? "Listening for voice commands..." : "Click the orb to start a new voice note.")}
                            </motion.p>
                        </AnimatePresence>
                    </div>

                </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <audio ref={audioRef} className="hidden" />

      {/* AI Chat Dialog */}
      <Dialog open={isAskAiOpen} onOpenChange={setIsAskAiOpen}>
          <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
              <AIChatInterface aIMessages={aIMessages} onSendMessage={handleAiChatMessage} isPending={aiChatMutation.isPending} />
          </DialogContent>
      </Dialog>


      <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>AI Session Summary</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[50vh] my-4"><p className="whitespace-pre-wrap text-sm">{sessionSummary}</p></ScrollArea>
          <DialogFooter>
            <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(sessionSummary); toast({ title: "Copied to clipboard!" }); }}>Copy</Button>
            <DialogClose asChild><Button>Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle className="flex items-center"><Sparkles className="mr-2 h-5 w-5 text-primary" /> AI Power-up</DialogTitle></DialogHeader>
            <div className="my-4">
                <p className="font-semibold mb-2">Your Note:</p>
                <blockquote className="border-l-2 pl-4 italic text-muted-foreground">{selectedNote?.transcription}</blockquote>
            </div>
            {aiMutation.isPending ? (
                <div className="flex items-center justify-center h-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : aiResponse ? (
                <div>
                    <p className="font-semibold mb-2">AI Response:</p>
                    <ScrollArea className="max-h-[30vh] p-4 bg-muted rounded-md"><p className="text-sm whitespace-pre-wrap">{aiResponse}</p></ScrollArea>
                </div>
            ) : (
                 <div className="flex justify-center gap-4 mt-6">
                    <Button onClick={() => handleAiRequest('explain')}>Explain</Button>
                    <Button onClick={() => handleAiRequest('summarize')}>Summarize</Button>
                </div>
            )}
             <DialogFooter className="mt-4">
                <Button variant="ghost" onClick={() => { setAiResponse(''); aiMutation.reset(); }}>Ask Again</Button>
                <DialogClose asChild><Button>Close</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}