import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import { buildApiUrl } from '../lib/apiBase';
import { Upload, FileText, BookOpen, Clock, Brain, Trash2, Eye } from 'lucide-react';

interface Course {
  id: number;
  title: string;
  description: string;
}

interface Lesson {
  id: number;
  title: string;
  content: string;
  duration: number;
  orderIndex: number;
}

interface ProcessingResult {
  success: boolean;
  message: string;
  lessonsCreated: number;
  totalPages: number;
  wordCount: number;
}

export default function TeacherPDFUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch teacher's courses
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['/api/teacher/courses'],
    enabled: true
  });

  // Fetch lessons for selected course
  const { data: courseLessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ['/api/teacher/course', selectedCourse, 'lessons'],
    enabled: !!selectedCourse
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(buildApiUrl('/api/teacher/upload-pdf'), {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setProcessingResult(data);
      queryClient.invalidateQueries({ queryKey: ['/api/teacher/course', selectedCourse, 'lessons'] });
      toast({
        title: "PDF Processing Complete",
        description: data.message,
      });
      setSelectedFile(null);
      setUploadProgress(0);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      const response = await fetch(buildApiUrl(`/api/teacher/lessons/${lessonId}`), {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete lesson');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teacher/course', selectedCourse, 'lessons'] });
      toast({
        title: "Lesson Deleted",
        description: "The lesson has been removed successfully.",
      });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select a PDF file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedCourse) {
      toast({
        title: "Missing Information",
        description: "Please select both a file and a course.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('pdf', selectedFile);
    formData.append('courseId', selectedCourse);
    const selectedCourseData = (courses as Course[])?.find((c: Course) => c.id.toString() === selectedCourse);
    formData.append('courseTitle', selectedCourseData?.title || 'Course');

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    uploadMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Brain className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">AI-Powered Lesson Extraction</h1>
      </div>
      
      <div className="text-gray-600">
        Upload PDF documents and let AI automatically extract and organize lessons using advanced NLP techniques
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Upload PDF Document</span>
            </CardTitle>
            <CardDescription>
              Upload educational PDFs to automatically extract lessons using NLTK and Natural Language Processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="course-select">Select Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {(courses as Course[])?.map((course: Course) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="file-upload">PDF Document</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
            </div>

            {selectedFile && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-xs text-gray-500">
                  Analyzing document structure and extracting lessons using NLP
                </p>
              </div>
            )}

            <Button 
              onClick={handleUpload}
              disabled={!selectedFile || !selectedCourse || isUploading}
              className="w-full"
            >
              {isUploading ? 'Processing Document...' : 'Extract Lessons with AI'}
            </Button>

            {processingResult && (
              <Alert className="bg-green-50 border-green-200">
                <BookOpen className="h-4 w-4" />
                <AlertDescription>
                  <strong>Processing Complete!</strong><br />
                  Created {processingResult.lessonsCreated} lessons from {processingResult.totalPages} pages 
                  ({processingResult.wordCount.toLocaleString()} words)
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* NLP Features Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>AI Processing Features</span>
            </CardTitle>
            <CardDescription>
              Advanced natural language processing capabilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="mt-1">NLTK</Badge>
                <div>
                  <p className="font-medium">Text Chunking & Segmentation</p>
                  <p className="text-sm text-gray-500">
                    Intelligent text splitting using sentence tokenization and paragraph analysis
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="mt-1">NLP</Badge>
                <div>
                  <p className="font-medium">Content Summarization</p>
                  <p className="text-sm text-gray-500">
                    Extractive summarization using keyword frequency and sentence scoring
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="mt-1">AI</Badge>
                <div>
                  <p className="font-medium">Topic Extraction</p>
                  <p className="text-sm text-gray-500">
                    Automatic identification of key topics and learning objectives
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="mt-1">Smart</Badge>
                <div>
                  <p className="font-medium">Duration Estimation</p>
                  <p className="text-sm text-gray-500">
                    Reading time calculation based on content complexity and word count
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Extracted Lessons */}
      {selectedCourse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <span>Extracted Lessons</span>
            </CardTitle>
            <CardDescription>
              Lessons automatically generated from uploaded documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lessonsLoading ? (
              <div className="text-center py-8">
                <div className="animate-pulse">Loading lessons...</div>
              </div>
            ) : (courseLessons as any)?.lessons?.length > 0 ? (
              <div className="space-y-4">
                {(courseLessons as any).lessons.map((lesson: Lesson, index: number) => (
                  <Card key={lesson.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{lesson.title}</h3>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{lesson.duration} min</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span>Order: {lesson.orderIndex + 1}</span>
                            </div>
                          </div>
                          <p className="mt-2 text-gray-600 line-clamp-3">
                            {lesson.content.substring(0, 200)}...
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // TODO: Implement lesson preview
                              toast({
                                title: "Preview Feature",
                                description: "Lesson preview coming soon!",
                              });
                            }}
                          >
                            <Eye className="h-4 w-4" />
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No lessons found. Upload a PDF to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
