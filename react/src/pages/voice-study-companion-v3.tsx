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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../components/ui/dialog';
import { VoiceVisualizer, useVoiceVisualizer } from 'react-voice-visualizer';
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
  Send,
  PanelLeftOpen,
  PanelRightOpen,
  X,
  Plus
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "../hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from '../lib/utils';
import { useTheme } from '../hooks/use-theme';
import './voice-study-companion-v3.css';

// Re-using interfaces from V2
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

// Helper component for background particles
const ParticleBackground = () => {
    const particles = Array.from({ length: 25 });
    return (
        <div className="particle-background">
            {particles.map((_, i) => (
                <div
                    key={i}
                    className="particle"
                    style={{
                        left: `${Math.random() * 100}%`,
                        animationDuration: `${20 + Math.random() * 20}s`,
                        animationDelay: `${Math.random() * -40}s`,
                        width: `${Math.random() * 5 + 2}px`,
                        height: `${Math.random() * 5 + 2}px`,
                    }}
                />
            ))}
        </div>
    );
};


const AIChatInterface = ({ aIMessages, onSendMessage, isPending, className }) => {
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
        <div className={cn("w-full h-full flex flex-col", className)}>
             <ScrollArea className="flex-1 p-4 custom-scroll">
                <div className="space-y-6 max-w-3xl mx-auto w-full">
                    {aIMessages.map((msg, index) => (
                        <motion.div 
                            key={index} 
                            className={cn("flex items-start gap-3", msg.type === 'user' ? "justify-end" : "justify-start")}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {msg.type === 'ai' && <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex-shrink-0 flex items-center justify-center border border-primary/30"><Sparkles className="animate-pulse text-indigo-500" size={22}/></div>}
                            <div className={cn("max-w-xl p-4 rounded-2xl", msg.type === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                <p className="text-md">{msg.content}</p>
                            </div>
                        </motion.div>
                    ))}
                    {isPending && (
                        <div className="flex items-start gap-3 justify-start">
                            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex-shrink-0 flex items-center justify-center border border-primary/30"><Sparkles className="animate-pulse text-indigo-500" size={22}/></div>
                            <div className="bg-muted max-w-xs p-4 rounded-2xl text-md flex items-center">
                                <Loader2 className="h-5 w-5 animate-spin mr-3" />
                                Thinking...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
             </ScrollArea>
        </div>
    );
};

export default function VoiceStudyCompanionV3() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  // Voice Visualizer Hook
  const {
    start: startRecordingVis,
    stop: stopRecordingVis,
    mediaStream
  } = useVoiceVisualizer();

  
  // All states from V2, mostly reused
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
  const [selectedNote, setSelectedNote] = useState<AudioNote | null>(null);
  const [aiResponse, setAiResponse] = useState('');
  const [aIMessages, setAIMessages] = useState<Array<{ type: 'user' | 'ai', content: string }>>([
      { type: 'ai', content: "Hello! I am your AI study partner. Configure your session and let's begin." }
  ]);

  // All refs from V2, mostly reused
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // All mutations and effects from V2, mostly reused
  const aiChatMutation = useMutation({
    mutationFn: async (message: string) => new Promise<string>((resolve) => setTimeout(() => resolve(`This is a detailed answer to your question about "${message}".`), 1500)),
    onSuccess: (data) => setAIMessages(prev => [...prev, { type: 'ai', content: data }]),
    onError: () => setAIMessages(prev => [...prev, { type: 'ai', content: "Sorry, I couldn't process that request. Please try again." }]),
  });

  const handleAiChatMessage = (message: string) => {
    setAIMessages(prev => [...prev, { type: 'user', content: message }]);
    aiChatMutation.mutate(message);
  }

  const aiMutation = useMutation({
    mutationFn: async ({ text, action }: { text: string; action: 'explain' | 'summarize' }) => new Promise<string>((resolve) => setTimeout(() => resolve(action === 'explain' ? `This is a detailed explanation of "${text}".` : `This is a concise summary of "${text}".`), 1500)),
    onSuccess: (data) => setAiResponse(data),
    onError: () => setAiResponse("Sorry, I couldn't process that request. Please try again."),
  });

  useEffect(() => {
    const savedNotes = localStorage.getItem('study-session-notes-v3');
    if (savedNotes) setAudioNotes(JSON.parse(savedNotes));
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
      recognitionRef.current.onresult = (event) => handleVoiceCommand(event.results[event.results.length - 1][0].transcript.trim());
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => { setIsListening(false); if (currentSession && !currentSession.completed) startListening(); };
      recognitionRef.current.onerror = (event) => { console.error('Speech recognition error', event); setIsListening(false); };
    }
  }, [handleVoiceCommand, currentSession, selectedLanguage]);

  function startListening() {
    if (recognitionRef.current && !isListening) {
      try { recognitionRef.current.start(); } catch(e) { console.error("could not start listening", e); }
    }
  }

  function stopListening() {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }
  
  const speakText = async (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speechSpeed;
      utterance.volume = voiceVolume;
      utterance.lang = selectedLanguage;
      speechSynthesis.speak(utterance);
    } catch (error) { console.error("Speech synthesis error", error); }
  };

  function startStudySession() {
    if (!selectedSubject || !studyGoal) {
      toast({ title: "Setup Required", description: "Please select a subject and set a study goal.", variant: "destructive" });
      return;
    }
    const session: StudySession = { id: Date.now().toString(), title: `${selectedSubject} Study Session`, subject: selectedSubject, duration: sessionDuration, startTime: new Date(), notes: [], completed: false };
    setCurrentSession(session);
    setTimeElapsed(0);
    setAudioNotes([]);
    setIsSessionSetup(true);
    setAIMessages([{ type: 'ai', content: `Let's begin! Your ${sessionDuration}-minute session on ${selectedSubject} is starting now. What's on your mind?` }]);
    if (voiceCommandsEnabled) startListening();
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
    localStorage.setItem('study-session-notes-v3', JSON.stringify(audioNotes));
    toast({ title: "Notes Saved", description: `${audioNotes.length} audio notes have been saved.` });
  }

  async function startRecording() {
    if (!currentSession || isRecording) return;
    stopListening();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startRecordingVis(stream);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordingChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) recordingChunksRef.current.push(event.data); };
      mediaRecorder.onstop = () => {
        setIsLoading(true);
        const audioBlob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const newNote: AudioNote = { id: Date.now().toString(), timestamp: timeElapsed, audioUrl, transcription: "Processing...", topic: "General", duration: 0 };
        setAudioNotes(prev => [...prev, newNote]);
        setTimeout(() => {
            setAudioNotes(prev => prev.map(n => n.id === newNote.id ? {...n, transcription: "This is a dummy transcription of your brilliant idea."} : n));
            setIsLoading(false);
        }, 2000);
        stream.getTracks().forEach(track => track.stop());
        stopRecordingVis();
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({ title: "Microphone Error", description: "Could not access microphone.", variant: "destructive" });
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (voiceCommandsEnabled) startListening();
    }
  }

  function deleteAudioNote(noteId: string) {
    setAudioNotes(prev => prev.filter(n => n.id !== noteId));
    toast({ title: "Note Deleted" });
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

  const handleAskAiClick = () => {
    chatInputRef.current?.focus();
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  const renderSessionSetup = () => (
    <motion.div 
        key="setup" 
        initial={{opacity: 0, scale: 0.95}} 
        animate={{opacity: 1, scale: 1}} 
        exit={{opacity: 0, scale: 0.95}} 
        className="w-full max-w-lg mx-auto text-center setup-container"
    >
        <h2 className="text-5xl font-extrabold tracking-tighter mb-4">Voice Study Companion</h2>
        <p className="text-muted-foreground text-lg mb-8">Your personal AI-powered study partner. Let's get started.</p>
        <Card className="text-left glass-effect">
            <CardHeader><CardTitle>New Session</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <Select value={selectedSubject} onValueChange={setSelectedSubject}><SelectTrigger className="bg-background/80"><SelectValue placeholder="Choose subject" /></SelectTrigger><SelectContent><SelectItem value="gen-sci">General Science</SelectItem><SelectItem value="history-101">History 101</SelectItem><SelectItem value="literature">Literature</SelectItem></SelectContent></Select>
                <Select value={String(sessionDuration)} onValueChange={v => setSessionDuration(Number(v))}><SelectTrigger className="bg-background/80"><SelectValue placeholder="Session duration" /></SelectTrigger><SelectContent><SelectItem value="15">15 mins</SelectItem><SelectItem value="30">30 mins</SelectItem><SelectItem value="60">60 mins</SelectItem></SelectContent></Select>
                <Input value={studyGoal} onChange={e => setStudyGoal(e.target.value)} placeholder="What's your study goal for this session?" className="bg-background/80" />
                <Button onClick={startStudySession} size="lg" className="w-full" disabled={!selectedSubject || !studyGoal}><Plus className="mr-2 h-5 w-5"/>Start Session</Button>
            </CardContent>
        </Card>
    </motion.div>
  );

  return (
    <div className={cn("voice-companion-v3", theme)}>
        <ParticleBackground />
        
        <header className="companion-header glass-effect">
            <div className="flex items-center gap-4">
                <Link href="/dashboard"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back</Button></Link>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="sm" disabled={!isSessionSetup}><PanelLeftOpen className="h-4 w-4 mr-2" />My Notes</Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="glass-effect sidebar-content w-[350px] sm:w-[400px]">
                        <SheetHeader><SheetTitle>My Voice Notes</SheetTitle></SheetHeader>
                        <ScrollArea className="h-[calc(100vh-80px)] mt-4 pr-4 custom-scroll">
                            {audioNotes.length === 0 && <p className='text-center text-muted-foreground pt-16'>No notes recorded yet.</p>}
                            <div className="space-y-3">
                            <AnimatePresence>
                              {audioNotes.map(note => (
                                <motion.div key={note.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <div className="note-card-v3 p-4 rounded-lg glass-effect">
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                              <Badge variant="secondary">{formatTime(note.timestamp)}</Badge>
                                              <p className="my-2 text-sm text-foreground">{note.transcription}</p>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                              <Button size="icon" variant="ghost" onClick={() => {if(audioRef.current){audioRef.current.src=note.audioUrl; audioRef.current.play()}}}><Play className="h-4 w-4"/></Button>
                                              <Button size="icon" variant="ghost" className="text-primary" onClick={() => handleAiAction(note)}><Sparkles className="h-4 w-4"/></Button>
                                              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteAudioNote(note.id)}><Trash2 className="h-4 w-4"/></Button>
                                            </div>
                                      </div>
                                    </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                            </div>
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
                 {isSessionSetup && (
                    <Button variant="outline" size="sm" onClick={handleAskAiClick}>
                        <Sparkles className="h-4 w-4 mr-2 animate-pulse text-indigo-500" />
                        Ask AI
                    </Button>
                )}
            </div>
            {isSessionSetup && currentSession && (
                <div className="flex items-center gap-4 text-sm">
                    <div className='text-right'>
                        <p className="font-bold">{currentSession.title}</p>
                        <p className="text-muted-foreground">{studyGoal}</p>
                    </div>
                    <div className="w-24 text-center">
                        <p className="font-mono font-semibold text-lg">{formatTime(timeElapsed)}</p>
                    </div>
                    <Button onClick={endStudySession} variant="destructive" size="sm"><X className="h-4 w-4 mr-1.5"/> End Session</Button>
                </div>
            )}
            <div className="flex items-center gap-4">
                 <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                    {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </Button>
                <Sheet>
                    <SheetTrigger asChild><Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-2" />Settings</Button></SheetTrigger>
                    <SheetContent side="right" className="glass-effect sidebar-content w-[350px]">
                        <SheetHeader><SheetTitle>Configuration</SheetTitle></SheetHeader>
                        <div className="space-y-6 mt-6">
                            <div className="flex items-center justify-between p-2 rounded-lg">
                                <div className='flex items-center gap-3 text-sm'><ToggleLeft className="w-5 h-5 text-muted-foreground" /><span>AI Voice Enabled</span></div>
                                <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} />
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg">
                                 <div className='flex items-center gap-3 text-sm'><Mic2 className="w-5 h-5 text-muted-foreground" /><span>Voice Commands</span></div>
                                <Switch checked={voiceCommandsEnabled} onCheckedChange={setVoiceCommandsEnabled} />
                            </div>
                            <div className="p-2 rounded-lg space-y-2">
                                <label className='text-sm flex items-center gap-3'><Gauge className="w-5 h-5 text-muted-foreground" />Language</label>
                                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="en-US">English (US)</SelectItem><SelectItem value="en-GB">English (UK)</SelectItem></SelectContent></Select>
                            </div>
                             <div className="p-2 rounded-lg space-y-2">
                                <label className='text-sm flex items-center gap-3'><Gauge className="w-5 h-5 text-muted-foreground" />Speech Speed: <span className="font-bold">{speechSpeed.toFixed(1)}x</span></label>
                                <Slider value={[speechSpeed]} onValueChange={v => setSpeechSpeed(v[0])} min={0.5} max={2} step={0.1} />
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </header>

        <main className="companion-main">
            <AnimatePresence mode="wait">
                {!isSessionSetup ? renderSessionSetup() : (
                    <motion.div key="chat" className="w-full h-full" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
                        <AIChatInterface aIMessages={aIMessages} onSendMessage={handleAiChatMessage} isPending={aiChatMutation.isPending} />
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
        
        {isSessionSetup && (
            <footer className="companion-footer">
                <div className="chat-input-container">
                    <div className="w-full h-full relative">
                        <Input 
                            ref={chatInputRef}
                            placeholder={isRecording ? "Recording your thoughts..." : "Type a message or press the mic to talk..."} 
                            disabled={!isSessionSetup || isRecording} 
                            className="chat-input glass-effect" 
                        />
                        <div className="chat-input-buttons">
                            <Button size="icon" variant={isRecording ? "destructive" : "default"} onClick={isRecording ? stopRecording : startRecording} disabled={!isSessionSetup} className="rounded-full w-10 h-10">
                                <Mic className="h-5 w-5" />
                            </Button>
                            <Button size="icon" type="submit" className="rounded-full w-10 h-10"><Send className="h-5 w-5" /></Button>
                        </div>
                        {isRecording && mediaStream && (
                            <div className="voice-visualizer-bar">
                                <VoiceVisualizer mediaStream={mediaStream} width={780} height={54} />
                            </div>
                        )}
                    </div>
                </div>
            </footer>
        )}

        <audio ref={audioRef} className="hidden" />

        <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
            {/* Same AI Power-up dialog from V2 */}
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
