import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CourseCard from '@/components/courses/CourseCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, CheckCircle, GraduationCap, Loader2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { coursesAPI, enrollmentsAPI, usersAPI, Course, Enrollment } from '@/services/api';
import { format } from 'date-fns';

interface EnrollmentWithDetails extends Enrollment {
  courseName?: string;
  courseCode?: string;
  instructorName?: string;
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
  const [advisors, setAdvisors] = useState<{ id: string; name: string; department: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState<string | null>(null);

  // Fetch data on mount
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Fetch courses
      const coursesResult = await coursesAPI.getOpen();
      if (coursesResult.success && coursesResult.data?.courses) {
        setCourses(coursesResult.data.courses);
      }

      // Fetch student's enrollments
      const enrollmentsResult = await enrollmentsAPI.getForStudent(user.id);
      if (enrollmentsResult.success && enrollmentsResult.data?.enrollments) {
        const enrichedEnrollments = enrollmentsResult.data.enrollments.map((e: any) => ({
          ...e,
          id: e._id || e.id,
          courseName: e.courseId?.name || 'Unknown Course',
          courseCode: e.courseId?.code || 'N/A',
          instructorName: 'Course Instructor',
          courseId: e.courseId?._id || e.courseId,
          studentId: e.studentId?._id || e.studentId,
        }));
        setEnrollments(enrichedEnrollments);
      }

      // Fetch advisors for enrollment
      const advisorsResult = await usersAPI.getByRole('advisor');
      if (advisorsResult.success && advisorsResult.data?.users) {
        setAdvisors(advisorsResult.data.users.map((a: any) => ({
          id: a.id,
          name: a.name,
          department: a.department
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEnroll = async (courseId: string) => {
    if (!user?.id) return;

    setIsEnrolling(courseId);

    // Backend now handles matching the student branch to the advisor automatically
    const result = await enrollmentsAPI.create(user.id, courseId);

    setIsEnrolling(null);

    if (result.success) {
      const course = courses.find(c => c.id === courseId);
      toast({
        title: 'Enrollment Request Sent!',
        description: `Your request for ${course?.name} has been sent to the instructor for approval.`,
      });
      // Refresh data
      fetchData();
    } else {
      toast({
        title: 'Enrollment Failed',
        description: result.error || 'Could not submit enrollment request',
        variant: 'destructive',
      });
    }
  };

  // Compute counts
  const enrolledCount = enrollments.filter(e => e.status === 'approved').length;
  const pendingCount = enrollments.filter(e => e.status === 'pending_instructor' || e.status === 'pending_advisor').length;
  const enrolledCourseIds = enrollments.filter(e => e.status === 'approved').map(e => e.courseId);
  const pendingCourseIds = enrollments.filter(e => e.status === 'pending_instructor' || e.status === 'pending_advisor').map(e => e.courseId);

  const availableCourses = courses.filter(
    c => !enrolledCourseIds.includes(c.id) && !pendingCourseIds.includes(c.id)
  );
  const myEnrolledCourses = courses.filter(c => enrolledCourseIds.includes(c.id));
  const myPendingCourses = courses.filter(c => pendingCourseIds.includes(c.id));

  const checkEligibility = (course: Course) => {
    if (!user?.department) return true;
    if (!course.eligibleBranches) return true; // Safety fallback
    return course.eligibleBranches.includes(user.department) || course.eligibleBranches.includes('All');
  };

  const handleWithdraw = async (enrollmentId: string) => {
    if (!confirm('Are you sure you want to withdraw from this course? This action cannot be undone immediately if seats fill up.')) return;

    const result = await enrollmentsAPI.withdraw(enrollmentId);
    if (result.success) {
      toast({
        title: 'Withdrawn',
        description: 'You have successfully withdrawn from the course.',
      });
      fetchData();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to withdraw',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'pending_instructor': return 'status-pending';
      case 'pending_advisor': return 'status-pending';
      case 'withdrawn': return 'destructive';
      default: return 'status-pending';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'pending_instructor': return 'Pending Instructor';
      case 'pending_advisor': return 'Pending Advisor';
      case 'withdrawn': return 'Withdrawn';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
              Student Dashboard
            </h1>
            <Button variant="ghost" size="icon" onClick={() => fetchData()} title="Refresh Data">
              <Loader2 className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-muted-foreground">
            Welcome, {user?.name}! Browse courses and track your enrollment status
          </p>
          <div className="flex gap-4">
            <Card className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{enrolledCount}</p>
                  <p className="text-xs text-muted-foreground">Enrolled</p>
                </div>
              </div>
            </Card>
            <Card className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-pending/10">
                  <Clock className="h-5 w-5 text-pending" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="available" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="available" className="gap-2">
              <BookOpen className="h-4 w-4 hidden sm:block" />
              Available
            </TabsTrigger>
            <TabsTrigger value="enrolled" className="gap-2">
              <CheckCircle className="h-4 w-4 hidden sm:block" />
              My Courses
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4 hidden sm:block" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Courses Open for Enrollment
            </h2>
            {availableCourses.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No courses available for enrollment at this time.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableCourses.map(course => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onEnroll={handleEnroll}
                    isEnrolling={isEnrolling === course.id}
                    showEnrollButton={true}
                    isEligible={checkEligibility(course)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="enrolled" className="space-y-6 animate-fade-in">
            {/* Enrolled Courses */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                Enrolled Courses
              </h2>
              {myEnrolledCourses.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">You haven't enrolled in any courses yet.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myEnrolledCourses.map(course => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      showEnrollButton={false}
                      isEnrolled={true}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Pending Requests */}
            {myPendingCourses.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-pending" />
                  Pending Approval
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myPendingCourses.map(course => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      showEnrollButton={false}
                      isPending={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enrollment History</CardTitle>
                <CardDescription>Track all your enrollment requests and their status</CardDescription>
              </CardHeader>
              <CardContent>
                {enrollments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No enrollment requests yet.</p>
                    <p className="text-sm">Apply for a course to see your history here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {enrollments.map(request => (
                      <div
                        key={request.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-muted/50 gap-3"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">{request.courseName}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.courseCode} • {request.instructorName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Requested: {request.createdAt ? format(new Date(request.createdAt), 'MMM dd, yyyy') : 'N/A'}
                          </p>
                          {request.status === 'rejected' && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              {request.instructorRemarks || request.advisorRemarks || 'Request was rejected'}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={getStatusBadgeVariant(request.status) as any}>
                            {getStatusLabel(request.status)}
                          </Badge>
                          {['pending_instructor', 'pending_advisor', 'approved'].includes(request.status) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive border-destructive hover:bg-destructive/10"
                              onClick={() => handleWithdraw(request.id)}
                            >
                              Withdraw
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
