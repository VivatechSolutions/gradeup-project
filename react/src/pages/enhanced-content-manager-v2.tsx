import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { Alert, AlertDescription } from "../components/ui/alert";
import { buildApiUrl } from "../lib/apiBase";
import {
  Upload,
  FileText,
  Brain,
  BookOpen,
  Target,
  Clock,
  CheckCircle,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Lightbulb,
  Tags,
  BookMarked,
  ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/use-auth";
import { motion } from "framer-motion";

// Schemas from EnhancedContentManager
const enhancedCourseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  grade: z.number().min(1).max(12),
  subjectId: z.number().min(1),
  learningObjectives: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
});

const nlpProcessingSchema = z.object({
  file: z.any(),
  courseId: z.number(),
  processingMode: z.enum(["basic", "advanced", "comprehensive"]),
  extractConcepts: z.boolean().default(true),
  generateExercises: z.boolean().default(true),
  createQuizzes: z.boolean().default(false),
});

type EnhancedCourseForm = z.infer<typeof enhancedCourseSchema>;
type NLPProcessingForm = z.infer<typeof nlpProcessingSchema>;

interface ProcessingResult {
  success: boolean;
  message: string;
  chapters: any[]; // Simplified for now
  lessons: any[]; // Simplified for now
  totalPages: number;
  wordCount: number;
  readingLevel: string;
  subjectClassification: string;
  conceptMap: any[]; // Simplified for now
}
const PageDecoration = ({ type, variant = 1, position = "top" }) => {
    const isTop = position === "top";
    
    // Different shapes based on page index or type
    const shapes = {
      wave: "polygon(0% 0%, 100% 0%, 100% 60%, 80% 90%, 50% 70%, 20% 90%, 0% 60%)",
      curve: "ellipse(100% 100% at 50% 0%)",
      corner: isTop 
        ? "polygon(0 0, 100% 0, 100% 20%, 0 80%)" 
        : "polygon(0 20%, 100% 80%, 100% 100%, 0 100%)",
      organic: "circle(70% at 50% -10%)"
    };
  
    const style = {
      position: 'absolute',
      left: 0,
      right: 0,
      height: '120px',
      backgroundColor: `var(--deco-color-${variant})`,
      opacity: 0.15,
      zIndex: 0,
      clipPath: shapes[type] || shapes.wave,
      [isTop ? 'top' : 'bottom']: 0,
      pointerEvents: 'none'
    };
  
    // Secondary accent shape (the darker thin line in the image)
    const accentStyle = {
      ...style,
      height: '130px',
      opacity: 0.1,
      backgroundColor: 'var(--deco-accent-color)',
      transform: 'translateY(5px) scaleX(1.1)',
      zIndex: -1
    };
  
    return (
      <>
        <div style={accentStyle} />
        <div style={style} />
      </>
    );
  };

export default function EnhancedContentManagerV2() {
  // States from BookContentWindow
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // States from EnhancedContentManager
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [activeManagerTab, setActiveManagerTab] = useState("manage");


  // Data fetching from EnhancedContentManager
  const { data: courses = [] } = useQuery({
    queryKey: ["/api/teacher/courses"],
    initialData: [],
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["/api/subjects"],
    initialData: [],
  });

  const { data: courseLessons = [] } = useQuery({
    queryKey: [`/api/lessons/${selectedCourse?.id}`],
    enabled: !!selectedCourse,
  });

  // Forms from EnhancedContentManager
  const courseForm = useForm<EnhancedCourseForm>({
    resolver: zodResolver(enhancedCourseSchema),
    defaultValues: {
      title: "",
      description: "",
      grade: 9,
      subjectId: 1,
    },
  });

  const processingForm = useForm<NLPProcessingForm>({
    resolver: zodResolver(nlpProcessingSchema),
  });

  // Mutations from EnhancedContentManager
  const createCourseMutation = useMutation({
    mutationFn: async (data: EnhancedCourseForm) => {
        const response = await fetch(buildApiUrl('/api/courses'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, teacherId: user?.id }),
            credentials: 'include',
          });
          if (!response.ok) throw new Error('Failed to create course');
          return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Course created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/courses"] });
      courseForm.reset();
    },
    onError: () => {
        toast({
            title: "Error",
            description: "Failed to create course",
            variant: "destructive",
          });
    },
  });

  const processDocumentMutation = useMutation({
    mutationFn: async (data: { file: File; courseId: number; options: any }) => {
        const formData = new FormData();
        formData.append('pdf', data.file);
        formData.append('courseId', data.courseId.toString());
        formData.append('options', JSON.stringify(data.options));
  
        const response = await fetch(buildApiUrl('/api/teacher/process-document-nlp'), {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
  
        if (!response.ok) throw new Error('Failed to process document');
        return response.json();
    },
    onSuccess: (result) => {
        setProcessingResult(result);
        toast({
          title: "Processing Complete",
          description: `Successfully processed document.`,
        });
        if (selectedCourse) {
          queryClient.refetchQueries({ queryKey: [`/api/lessons/${selectedCourse.id}`] });
        }
    },
    onError: () => {
        toast({
            title: "Processing Failed",
            description: "Failed to process document.",
            variant: "destructive",
          });
    },
  });

  // Event Handlers from EnhancedContentManager
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "application/pdf" || file.name.endsWith(".docx"))) {
      setSelectedFile(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a PDF or DOCX file.",
        variant: "destructive",
      });
    }
  };

  const handleProcessDocument = async (data: NLPProcessingForm) => {
    if (!selectedFile || !selectedCourse) return;
    setProcessingProgress(0);
    const progressInterval = setInterval(() => {
        setProcessingProgress(prev => Math.min(prev + 10, 90));
      }, 500);
    try {
        await processDocumentMutation.mutateAsync({
            file: selectedFile,
            courseId: selectedCourse.id,
            options: data
        });
        setProcessingProgress(100);
    }
    finally {
        clearInterval(progressInterval);
    }
  };

  const handleCreateCourse = (data: EnhancedCourseForm) => {
    createCourseMutation.mutate(data);
  };

  // Effect from BookContentWindow
  useEffect(() => {
    const timer = setTimeout(() => setIsLoadingPage(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoadingPage) {
    return (
      <div className="app-root" data-theme={isDark ? "dark" : "light"}>
        <div className="overlay">
          <div className="book-loader"></div>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  // Library View (List of Courses)
  if (!selectedCourse) {
    return (
      <div className="app-root" data-theme={isDark ? "dark" : "light"}>
        <div className="library-wrapper">
          <header className="premium-header">
            <Link href="/teacher-dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
            <div className="brand">
              <h1 className="logo">Content<span>Manager</span></h1>
            </div>
            <div className="header-actions">
              <button className="theme-toggle" onClick={() => setIsDark(!isDark)}>
                {isDark ? "Light ☀️" : "Dark 🌙"}
              </button>
            </div>
          </header>
          <main className="content-area">
            <section className="welcome-hero">
              <h2>Your Course Library</h2>
              <p>Select a course to manage its content, or create a new one.</p>
            </section>
            <div className="book-grid">
              {courses.map((course: any) => (
                <div key={course.id} className="book-card-premium" onClick={() => setSelectedCourse(course)}>
                  <div className="book-visual" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}>
                  <span className="book-symbol">📚</span>
                  </div>
                  <div className="book-info">
                    <span className="subject-tag">Grade {course.grade}</span>
                    <h3>{course.title}</h3>
                    <div className="card-footer">
                      <span className="chapters-count">{course.lessons?.length || 0} Lessons</span>
                      <div className="arrow-btn">→</div>
                    </div>
                  </div>
                </div>
              ))}
               <Card className="p-4 items-center justify-center flex flex-col">
                <CardHeader>
                    <CardTitle>Create New Course</CardTitle>
                </CardHeader>
                <CardContent>
                <form onSubmit={courseForm.handleSubmit(handleCreateCourse)} className="space-y-4">
                    <Input {...courseForm.register("title")} placeholder="Course Title" />
                    <Textarea {...courseForm.register("description")} placeholder="Course Description" />
                    <Input type="number" {...courseForm.register("grade", { valueAsNumber: true })} placeholder="Grade" />
                     <Select onValueChange={(value) => courseForm.setValue("subjectId", parseInt(value))}>
                        <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                        <SelectContent>
                            {subjects.map((subject: any) => <SelectItem key={subject.id} value={subject.id.toString()}>{subject.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button type="submit" disabled={createCourseMutation.isPending}>
                        {createCourseMutation.isPending ? 'Creating...' : 'Create Course'}
                    </Button>
                </form>
                </CardContent>
               </Card>
            </div>
          </main>
        </div>
        <style>{styles}</style>
      </div>
    );
  }
  
  // Reader View (Content Manager)
  return (
    <div className="app-root" data-theme={isDark ? "dark" : "light"}>
       <motion.div key="reader-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="workstation">
            <aside className={`sidebar glass ${isSidebarOpen ? "open" : ""}`}>
                <button className="exit-btn" onClick={() => setSelectedCourse(null)}>
                    ← Back to Library
                </button>
                <div className="nav-group">
                    <label>{selectedCourse.title}</label>
                    <div className={`nav-item ${activeManagerTab === 'manage' ? 'active' : ''}`} onClick={() => setActiveManagerTab('manage')}><BookMarked className="h-4 w-4 mr-2" />Manage</div>
                    <div className={`nav-item ${activeManagerTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveManagerTab('upload')}><Upload className="h-4 w-4 mr-2" />Process Docs</div>
                    <div className={`nav-item ${activeManagerTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveManagerTab('analytics')}><BarChart3 className="h-4 w-4 mr-2" />Analytics</div>
                </div>
            </aside>

            <main className="main-viewport">
            <div className="book-container-wrapper">
            <article className="book-container">
            <div className="book-spine"></div>

            {/* LEFT PAGE */}
            <section className="book-page left">
                <PageDecoration type={"wave"} position="top" variant={1} />
                <PageDecoration type="corner" position="bottom" variant={2} />
                <div className="page-header">
                    <span className="chapter-tag">{selectedCourse.title}</span>
                    <h1 className="chapter-title">
                        {activeManagerTab === 'manage' && "Content Management"}
                        {activeManagerTab === 'upload' && "Document Processor"}
                        {activeManagerTab === 'analytics' && "Course Analytics"}
                    </h1>
                </div>
                <div className="reading-text">
                {activeManagerTab === 'upload' && (
                    <Card>
                        <CardHeader><CardTitle>Upload Document</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <form onSubmit={processingForm.handleSubmit(handleProcessDocument)} className="space-y-4">
                                <Input type="file" accept=".pdf,.docx" onChange={handleFileSelect} />
                                <Select onValueChange={(v) => processingForm.setValue("processingMode", v as any)}>
                                    <SelectTrigger><SelectValue placeholder="Processing Mode" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="basic">Basic</SelectItem>
                                        <SelectItem value="advanced">Advanced</SelectItem>
                                        <SelectItem value="comprehensive">Comprehensive</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button type="submit" disabled={processDocumentMutation.isPending || !selectedFile}>
                                    {processDocumentMutation.isPending ? 'Processing...' : 'Start Processing'}
                                </Button>
                            </form>
                            {processDocumentMutation.isPending && <Progress value={processingProgress} />}
                        </CardContent>
                    </Card>
                )}
                {activeManagerTab === 'manage' && (
                    <p>Select a lesson from the right to view or edit it. New lessons can be generated via the 'Process Documents' tab.</p>
                )}
                 {activeManagerTab === 'analytics' && (
                    <div className="grid grid-cols-1 gap-4">
                        <Card><CardContent className="p-4"><p>Total Lessons</p><p className="text-2xl font-bold">{courseLessons.length}</p></CardContent></Card>
                        {processingResult && <Card><CardContent className="p-4"><p>Reading Level</p><p className="text-2xl font-bold">{processingResult.readingLevel}</p></CardContent></Card>}
                    </div>
                )}
                </div>
            </section>

            {/* RIGHT PAGE */}
            <section className="book-page right">
                <PageDecoration type={"corner"} position="top" variant={3} />
                <PageDecoration type="wave" position="bottom" variant={4} />

                <div className="page-content-container">
                {activeManagerTab === 'manage' && (
                    <ScrollArea className="h-full">
                        <h3 className="text-lg font-semibold mb-4">Course Lessons</h3>
                        <div className="space-y-2">
                        {courseLessons.map((lesson: any) => (
                            <Card key={lesson.id} className="p-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1 flex-1">
                                        <h4 className="font-medium">{lesson.title}</h4>
                                        <p className="text-sm text-gray-500">{lesson.summary?.substring(0,100)}...</p>
                                        <div className="flex gap-2">
                                            <Badge variant="outline">{lesson.difficulty}</Badge>
                                            <Badge variant="secondary">{lesson.estimatedDuration} min</Badge>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                        <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                        </div>
                    </ScrollArea>
                )}
                 {activeManagerTab === 'upload' && processingResult && (
                    <Card>
                        <CardHeader><CardTitle>Processing Results</CardTitle></CardHeader>
                        <CardContent>
                             <Alert>
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>{processingResult.message}</AlertDescription>
                            </Alert>
                             <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>Lessons Created: {processingResult.lessons?.length || 0}</div>
                                <div>Pages Processed: {processingResult.totalPages}</div>
                                <div>Reading Level: {processingResult.readingLevel}</div>
                                <div>Word Count: {processingResult.wordCount}</div>
                             </div>
                        </CardContent>
                    </Card>
                 )}
                </div>
            </section>
            </article>
            </div>
            </main>
        </div>
        </motion.div>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
.book-loader {
    width: 120px;
    height: 75px;
    border: 4px solid var(--accent);
    border-radius: 8px 20px 20px 8px;
    position: relative;
    animation: flip 2.5s infinite ease-in-out;
    transform-style: preserve-3d;
    perspective: 800px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  }
  .book-loader:before {
    content: '';
    position: absolute;
    top: -4px;
    left: -8px;
    width: 8px;
    height: calc(100% + 8px);
    background: var(--accent);
    border-radius: 8px 0 0 8px;
    filter: brightness(0.8);
  }
  @keyframes flip {
    0% {
      transform: rotateY(0);
    }
    50% {
      transform: rotateY(180deg);
    }
    100% {
      transform: rotateY(360deg);
    }
  }
:root {
    --bg-app: #fcfcfd;
    --text-main: #0f172a;
    --text-muted: #64748b;
    --card-bg: rgba(255, 255, 255, 0.8);
    --border: #f1f5f9;
    --accent: #6366f1;
    --shadow: 0 10px 30px -10px rgba(0,0,0,0.04);
    
    --book-bg: #fff;
    --book-page-bg-left: #fdfdfd;
    --book-page-bg-right: #ffffff;
    --book-text-title: #111827;
    --book-text-chapter: #3b82f6;
    --book-text-footer: #9ca3af;
    --book-text-page-number: #111827;
    --book-border: #d1d5db;
    --book-spine-gradient: linear-gradient(90deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.05) 100%);
  
    --deco-color-1: #60a5fa;
    --deco-color-2: #93c5fd;
    --deco-color-3: #3b82f6;
    --deco-color-4: #2563eb;
    --deco-accent-color: #1d4ed8;
  }
  
  [data-theme='dark'] {
    --bg-app: #020617;
    --text-main: #f8fafc;
    --text-muted: #cbd5e1;
    --card-bg: rgba(15, 23, 42, 0.6);
    --border: #1e293b;
    --shadow: 0 10px 40px -15px rgba(0,0,0,0.4);
  
    --book-bg: #0b1120;
    --book-page-bg-left: #0f172a;
    --book-page-bg-right: #020617;
    --book-text-title: #f8fafc;
    --book-text-chapter: #93c5fd;
    --book-text-footer: #64748b;
    --book-text-page-number: #cbd5e1;
    --book-border: #334155;
    --book-spine-gradient: linear-gradient(90deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.2) 100%);
    
    --deco-color-1: #1e40af;
    --deco-color-2: #1d4ed8;
    --deco-color-3: #2563eb;
    --deco-color-4: #3b82f6;
    --deco-accent-color: #93c5fd;
  }
  .app-root {
    min-height: 100vh;
    background: var(--bg-app);
    color: var(--text-main);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .library-wrapper {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 40px;
  }
  .premium-header {
    height: 100px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border);
  }
  .brand { display: flex; align-items: center; gap: 12px; }
  .logo { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.5px; }
  .logo span { font-weight: 300; opacity: 0.6; margin-left: 4px; }
  .header-actions { display: flex; align-items: center; gap: 32px; }
  .theme-toggle {
    background: var(--card-bg);
    border: 1px solid var(--border);
    padding: 8px 16px;
    border-radius: 99px;
    cursor: pointer;
    color: var(--text-main);
    font-size: 0.8rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: 0.3s;
  }
  .theme-toggle:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
  .welcome-hero { padding: 80px 0 60px; }
  .welcome-hero h2 { font-size: 2.5rem; font-weight: 800; letter-spacing: -1px; margin-bottom: 12px; }
  .welcome-hero p { color: var(--text-muted); font-size: 1.1rem; }
  .book-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 40px;
    padding-bottom: 100px;
  }
  .book-card-premium {
    background: var(--card-bg);
    border-radius: 24px;
    border: 1px solid var(--border);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow: var(--shadow);
    backdrop-filter: blur(12px);
  }
  
  .book-card-premium:hover {
    transform: translateY(-12px);
    border-color: var(--accent);
  }
  
  .book-visual {
    height: 180px;
    border-radius: 16px;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 15px 30px -10px rgba(0,0,0,0.2);
  }
  .book-symbol { font-size: 4rem; color: white; opacity: 0.9; }
  .subject-tag {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-weight: 700;
    color: var(--accent);
  }
  
  .book-info h3 { font-size: 1.4rem; font-weight: 700; margin: 8px 0 16px; line-height: 1.3; }
  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .chapters-count { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }
  
  .arrow-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    transition: 0.3s;
  }
  .book-card-premium:hover .arrow-btn {
    background: var(--accent);
    color: white;
    transform: translateX(4px);
  }
  .workstation {
      display: flex;
      height: 100vh;
  }
  .sidebar {
      width: 280px;
      padding: 20px;
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
  }
  .exit-btn {
      margin-bottom: 20px;
  }
  .nav-group {
      display: flex;
      flex-direction: column;
  }
  .nav-group label {
      font-size: 0.8rem;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 10px;
  }
  .nav-item {
      padding: 10px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
  }
  .nav-item.active {
      background: var(--accent);
      color: white;
  }
  .main-viewport {
      flex: 1;
      overflow: auto;
  }
  .book-container-wrapper {
    perspective: 2500px;
    padding: 2rem;
    min-height: 100%;
    width: 100%;
}
.book-container {
    display: flex;
    flex-direction: row;
    max-width: 1200px;
    margin: 0 auto;
    min-height: 85vh;
    border-radius: 8px 24px 24px 8px;
    box-shadow: 0 40px 80px rgba(0,0,0,0.3);
    position: relative;
    background: var(--book-bg);
    overflow: hidden;
    border: 1px solid var(--book-border);
}
.book-spine {
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 40px;
    transform: translateX(-50%);
    background: var(--book-spine-gradient);
    z-index: 10;
    pointer-events: none;
}
.book-page {
    flex: 1;
    padding: 70px 60px;
    display: flex;
    flex-direction: column;
    position: relative;
}
.book-page.left {
    background-color: var(--book-page-bg-left);
    border-right: 1px solid var(--book-border);
}
.book-page.right {
    background-color: var(--book-page-bg-right);
}
.page-header {
    margin-bottom: 30px;
    position: relative;
    z-index: 1;
}
.chapter-tag {
    font-size: 0.75rem;
    font-weight: bold;
    color: var(--book-text-chapter);
    letter-spacing: 0.1em;
}
.chapter-title {
    margin-top: 10px;
    font-size: 2.5rem;
    color: var(--book-text-title);
}
.reading-text {
    flex: 1;
    overflow-y: auto;
    position: relative;
    z-index: 1;
}
.page-content-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 1;
}

  .glass {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
  }
`;
