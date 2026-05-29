import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Progress } from "../components/ui/progress";
import { 
  Search, 
  Filter, 
  BookOpen, 
  Users, 
  Clock, 
  Star,
  Calculator,
  Atom,
  Beaker,
  Leaf,
  Book,
  Landmark,
  Code,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "../lib/queryClient";
import Navigation from "../components/navigation";
import { useToast } from "../hooks/use-toast";

const subjectIcons = {
  'Mathematics': Calculator,
  'Physics': Atom,
  'Chemistry': Beaker,
  'Biology': Leaf,
  'English Literature': Book,
  'History': Landmark,
  'Computer Science': Code
};

export default function CoursesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["/api/courses", selectedGrade !== "all" ? selectedGrade : undefined],
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["/api/subjects"],
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["/api/student/enrollments"],
    enabled: user?.role === "student",
  });

  const enrollMutation = useMutation({
    mutationFn: async (courseId: number) => {
      const res = await apiRequest("POST", "/api/enroll", { courseId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/enrollments"] });
      toast({
        title: "Enrolled Successfully",
        description: "You have been enrolled in the course!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Enrollment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const enrolledCourseIds = Array.isArray(enrollments) ? enrollments.map((e: any) => e.courseId) : [];

  const filteredCourses = Array.isArray(courses) ? courses.filter((course: any) => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = selectedGrade === "all" || course.grade.toString() === selectedGrade;
    const matchesSubject = selectedSubject === "all" || course.subjectId?.toString() === selectedSubject;
    
    return matchesSearch && matchesGrade && matchesSubject;
  }) : [];

  const handleRoleChange = (newRole: string) => {
    // In a real app, you might have more complex logic for changing roles
    // console.log("Switched role to:", newRole);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation currentRole={user?.role || "student"} onRoleChange={handleRoleChange} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="flex items-center gap-2 w-fit dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Explore Courses</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Discover new subjects and expand your knowledge</p>
        </div>

        {/* Filters - Responsive */}
        <Card className="mb-4 sm:mb-6 lg:mb-8 bg-white dark:bg-gray-800">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                />
              </div>
              
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:text-gray-300">
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="9">Grade 9</SelectItem>
                  <SelectItem value="10">Grade 10</SelectItem>
                  <SelectItem value="11">Grade 11</SelectItem>
                  <SelectItem value="12">Grade 12</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:text-gray-300">
                  <SelectItem value="all">All Subjects</SelectItem>
                  {Array.isArray(subjects) && subjects.map((subject: any) => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" className="flex items-center dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600">
                <Filter className="mr-2 h-4 w-4" />
                More Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Course Grid - Responsive */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse bg-white dark:bg-gray-800">
                <CardContent className="p-4 sm:p-6">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="h-16 sm:h-20 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {filteredCourses.map((course: any) => {
              const subject = Array.isArray(subjects) ? subjects.find((s: any) => s.id === course.subjectId) : null;
              const IconComponent = subject ? subjectIcons[subject.name as keyof typeof subjectIcons] || BookOpen : BookOpen;
              const isEnrolled = enrolledCourseIds.includes(course.id);
              
              return (
                <Card key={course.id} className="hover:shadow-lg transition-shadow card-hover bg-white dark:bg-gray-800" data-testid={`course-${course.id}`}>
                  <CardHeader className="pb-2 sm:pb-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary text-white p-2 sm:p-3 rounded-lg shrink-0">
                        <IconComponent className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base sm:text-lg truncate dark:text-white">{course.title}</CardTitle>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] sm:text-xs dark:border-gray-600 dark:text-gray-400">Grade {course.grade}</Badge>
                          {subject && (
                            <Badge variant="secondary" className="text-[10px] sm:text-xs dark:bg-gray-700 dark:text-gray-300">{subject.name}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <p className="text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 text-xs sm:text-sm line-clamp-2 sm:line-clamp-3">
                      {course.description || "Comprehensive course covering essential concepts and practical applications."}
                    </p>
                    
                    <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                          <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                          <span>24</span>
                        </div>
                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                          <span>8 wks</span>
                        </div>
                        <div className="flex items-center text-yellow-500">
                          <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 fill-current" />
                          <span>4.8</span>
                        </div>
                      </div>
                      
                      {isEnrolled && (
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600 dark:text-gray-400">Progress</span>
                            <span className="text-gray-600 dark:text-gray-400">67%</span>
                          </div>
                          <Progress value={67} className="h-2" />
                        </div>
                      )}
                    </div>
                    
                    {user?.role === "student" && (
                      <Button 
                        className="w-full text-xs sm:text-sm"
                        size="sm"
                        variant={isEnrolled ? "outline" : "default"}
                        onClick={() => {
                          if (isEnrolled) {
                            setLocation(`/courses/${course.id}`);
                          } else {
                            enrollMutation.mutate(course.id);
                          }
                        }}
                        disabled={enrollMutation.isPending}
                      >
                        {isEnrolled ? "Continue" : "Enroll Now"}
                      </Button>
                    )}
                    
                    {user?.role === "teacher" && (
                      <Button className="w-full text-xs sm:text-sm" size="sm" variant="outline"
                      >
                        View Details
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {filteredCourses.length === 0 && !isLoading && (
          <Card className="text-center py-12 bg-white dark:bg-gray-800">
            <CardContent>
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No courses found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your search criteria or browse all available courses.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}