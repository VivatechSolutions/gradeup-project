import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Navigation from "../components/navigation";
import { useAuth } from "../hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "../lib/queryClient";
import { buildApiUrl } from "../lib/apiBase";
import { useToast } from "../hooks/use-toast";
import { 
  BookOpen, 
  Plus, 
  Edit3, 
  Trash2, 
  FileText, 
  Users, 
  Calendar,
  Clock,
  GraduationCap,
  Target,
  Award,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

const courseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  grade: z.number().min(9).max(12),
  subjectId: z.number().min(1, "Subject is required"),
});

const lessonSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  courseId: z.number().min(1, "Course is required"),
  orderIndex: z.number().min(0),
});

const quizSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  courseId: z.number().min(1, "Course is required"),
  questions: z.array(z.object({
    question: z.string().min(1, "Question is required"),
    options: z.array(z.string()).min(2, "At least 2 options required"),
    correctAnswer: z.string().min(1, "Correct answer is required"),
  })).min(1, "At least one question required"),
});

type CourseForm = z.infer<typeof courseSchema>;
type LessonForm = z.infer<typeof lessonSchema>;
type QuizForm = z.infer<typeof quizSchema>;

export default function ContentManagerPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("courses");
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [currentRole, setCurrentRole] = useState(user?.role || "teacher");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Fetch data
  const { data: courses = [] } = useQuery({
    queryKey: ["/api/courses"],
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["/api/subjects"],
  });

  const { data: lessons = [] } = useQuery({
    queryKey: [`/api/lessons/${selectedCourse}`],
    enabled: !!selectedCourse,
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: [`/api/quizzes/${selectedCourse}`],
    enabled: !!selectedCourse,
  });

  // Course form
  const courseForm = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      grade: 9,
      subjectId: 1,
    },
  });

  // Lesson form
  const lessonForm = useForm<LessonForm>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: "",
      content: "",
      courseId: selectedCourse || 1,
      orderIndex: 0,
    },
  });

  // Quiz form
  const quizForm = useForm<QuizForm>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: "",
      description: "",
      courseId: selectedCourse || 1,
      questions: [{ question: "", options: ["", ""], correctAnswer: "" }],
    },
  });

  // Mutations
  const createCourseMutation = useMutation({
    mutationFn: async (data: CourseForm & { file?: File }) => {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('grade', data.grade.toString());
      formData.append('subjectId', data.subjectId.toString());
      
      if (data.file) {
        formData.append('courseFile', data.file);
      }

      const res = await fetch(buildApiUrl('/api/courses'), {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to create course');
      }
      
      return await res.json();
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      courseForm.reset();
      setUploadedFile(null);
      setIsProcessingFile(false);
      
      let message = "Course created successfully";
      if (response.lessonsGenerated) {
        message += ` with ${response.lessonsGenerated} lessons generated from uploaded file`;
      } else if (response.warning) {
        message = response.warning;
      }
      
      toast({ title: message });
    },
    onError: (error: Error) => {
      setIsProcessingFile(false);
      toast({
        title: "Error creating course",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createLessonMutation = useMutation({
    mutationFn: async (data: LessonForm) => {
      const res = await apiRequest("POST", "/api/lessons", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/lessons/${selectedCourse}`] });
      lessonForm.reset();
      toast({ title: "Lesson created successfully" });
    },
  });

  const createQuizMutation = useMutation({
    mutationFn: async (data: QuizForm) => {
      const res = await apiRequest("POST", "/api/quizzes", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quizzes/${selectedCourse}`] });
      quizForm.reset();
      toast({ title: "Quiz created successfully" });
    },
  });

  // Delete mutations
  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: number) => {
      const res = await apiRequest("DELETE", `/api/courses/${courseId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: "Course deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      const res = await apiRequest("DELETE", `/api/lessons/${lessonId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/lessons/${selectedCourse}`] });
      toast({ title: "Lesson deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteQuizMutation = useMutation({
    mutationFn: async (quizId: number) => {
      const res = await apiRequest("DELETE", `/api/quizzes/${quizId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quizzes/${selectedCourse}`] });
      toast({ title: "Quiz deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href="/">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Manager</h1>
          <p className="text-gray-600">Create and manage courses, lessons, and assessments</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="courses" className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4" />
              <span>Courses</span>
            </TabsTrigger>
            <TabsTrigger value="lessons" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Lessons</span>
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Quizzes</span>
            </TabsTrigger>
          </TabsList>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Courses</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Course
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Course</DialogTitle>
                    <DialogDescription>
                      Add a new course to your curriculum
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...courseForm}>
                    <form onSubmit={courseForm.handleSubmit((data) => {
                      setIsProcessingFile(!!uploadedFile);
                      createCourseMutation.mutate({ ...data, file: uploadedFile || undefined });
                    })} className="space-y-4">
                      <FormField
                        control={courseForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Course Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Advanced Algebra" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={courseForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Course description..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={courseForm.control}
                        name="grade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grade Level</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select grade" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="9">Grade 9</SelectItem>
                                <SelectItem value="10">Grade 10</SelectItem>
                                <SelectItem value="11">Grade 11</SelectItem>
                                <SelectItem value="12">Grade 12</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={courseForm.control}
                        name="subjectId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select subject" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {subjects.map((subject: any) => (
                                  <SelectItem key={subject.id} value={subject.id.toString()}>
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* File Upload Section */}
                      <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">Auto-Generate Lessons (Optional)</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Upload a PDF or text file to automatically generate structured lessons for this course.
                        </p>
                        
                        <div className="flex items-center space-x-2">
                          <input
                            type="file"
                            accept=".txt,.pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setUploadedFile(file);
                              }
                            }}
                            className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                        </div>
                        
                        {uploadedFile && (
                          <div className="flex items-center space-x-2 text-sm text-green-600">
                            <FileText className="h-4 w-4" />
                            <span>{uploadedFile.name} selected</span>
                            <button
                              type="button"
                              onClick={() => setUploadedFile(null)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </div>
                        )}
                        
                        <p className="text-xs text-blue-600">
                          Upload PDF or TXT files (max 100MB) to automatically generate structured lessons. The system will extract content or create comprehensive educational material based on your selected subject.
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          Note: If PDF extraction encounters issues, the system generates well-structured curriculum content tailored to your subject and grade level.
                        </p>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={createCourseMutation.isPending || isProcessingFile}
                      >
                        {isProcessingFile 
                          ? "Processing file and creating course..." 
                          : createCourseMutation.isPending 
                            ? "Creating course..." 
                            : "Create Course"
                        }
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course: any) => (
                <Card key={course.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{course.title}</CardTitle>
                        <CardDescription className="mt-2">{course.description}</CardDescription>
                      </div>
                      <Badge variant="secondary">Grade {course.grade}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <GraduationCap className="h-4 w-4 mr-2" />
                        <span>{subjects.find((s: any) => s.id === course.subjectId)?.name || 'Unknown Subject'}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        <span>0 students enrolled</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>Created {new Date(course.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setSelectedCourse(course.id);
                          setActiveTab("lessons");
                        }}
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Manage
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deleteCourseMutation.mutate(course.id)}
                        disabled={deleteCourseMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Lessons Tab */}
          <TabsContent value="lessons" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold">Lessons</h2>
                {selectedCourse && (
                  <p className="text-gray-600">
                    Managing lessons for: {courses.find((c: any) => c.id === selectedCourse)?.title}
                  </p>
                )}
              </div>
              {selectedCourse && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Lesson
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Lesson</DialogTitle>
                      <DialogDescription>
                        Add a new lesson to the selected course
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...lessonForm}>
                      <form onSubmit={lessonForm.handleSubmit((data) => createLessonMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={lessonForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Lesson Title</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Introduction to Quadratic Equations" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={lessonForm.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Lesson Content</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Enter lesson content..." 
                                  className="min-h-[200px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={lessonForm.control}
                          name="orderIndex"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Order</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full" disabled={createLessonMutation.isPending}>
                          {createLessonMutation.isPending ? "Creating..." : "Create Lesson"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {!selectedCourse ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Select a course from the Courses tab to manage its lessons</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {lessons.map((lesson: any, index: number) => (
                  <Card key={lesson.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {index + 1}. {lesson.title}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {lesson.content.substring(0, 150)}...
                          </CardDescription>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteLessonMutation.mutate(lesson.id)}
                            disabled={deleteLessonMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
                
                {lessons.length === 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No lessons created yet. Click "Create Lesson" to get started.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Quizzes Tab */}
          <TabsContent value="quizzes" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold">Quizzes</h2>
                {selectedCourse && (
                  <p className="text-gray-600">
                    Managing quizzes for: {courses.find((c: any) => c.id === selectedCourse)?.title}
                  </p>
                )}
              </div>
              {selectedCourse && (
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quiz
                </Button>
              )}
            </div>

            {!selectedCourse ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Select a course from the Courses tab to manage its quizzes</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {quizzes.map((quiz: any) => (
                  <Card key={quiz.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{quiz.title}</CardTitle>
                          <CardDescription className="mt-2">{quiz.description}</CardDescription>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteQuizMutation.mutate(quiz.id)}
                            disabled={deleteQuizMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>10 questions</span>
                        </div>
                        <div className="flex items-center">
                          <Award className="h-4 w-4 mr-1" />
                          <span>0 attempts</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {quizzes.length === 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-gray-500">
                        <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No quizzes created yet. Click "Create Quiz" to get started.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
  );
}
