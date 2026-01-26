import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EnrollmentRequestCard from '@/components/enrollment/EnrollmentRequestCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { BookOpen, Users, Clock, CheckCircle, XCircle, Inbox, Loader2, ExternalLink } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { instructorCoursesAPI, enrollmentsAPI, type InstructorCourseInfo } from '@/services/api';
import { useNavigate } from 'react-router-dom';

interface EnrollmentRequest {
    id: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    courseId: string;
    courseName: string;
    courseCode: string;
    status: string;
    instructorApproval?: boolean;
    instructorRemarks?: string;
    advisorApproval?: boolean;
    advisorRemarks?: string;
    createdAt: string;
    updatedAt: string;
}

const InstructorDashboard = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [courses, setCourses] = useState<InstructorCourseInfo[]>([]);
    const [availableCourses, setAvailableCourses] = useState<InstructorCourseInfo[]>([]);
    const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
    const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user?.id) return;

        setIsLoading(true);
        console.log('Fetching data for instructor:', user.id);
        try {
            // Fetch courses taught by this instructor
            const myCoursesResult = await instructorCoursesAPI.getMyCourses(user.id);
            if (myCoursesResult.success && myCoursesResult.data?.courses) {
                setCourses(myCoursesResult.data.courses);
            }

            // Fetch available courses (added by admin)
            const availableResult = await instructorCoursesAPI.getAvailable(user.id);
            if (availableResult.success && availableResult.data?.courses) {
                setAvailableCourses(availableResult.data.courses);
            }

            // Fetch enrollment requests for this instructor
            const requestsResult = await enrollmentsAPI.getForInstructor(user.id);
            if (requestsResult.success && requestsResult.data?.enrollments) {
                const enrollmentData = requestsResult.data.enrollments;
                if (Array.isArray(enrollmentData)) {
                    const enrichedRequests = enrollmentData.map((e: any) => ({
                        id: e._id || e.id,
                        studentId: e.studentId?._id || e.studentId,
                        studentName: e.studentId?.name || 'Unknown Student',
                        studentEmail: e.studentId?.email || '',
                        courseId: e.courseId?._id || e.courseId,
                        courseName: e.courseId?.name || 'Unknown Course',
                        courseCode: e.courseId?.code || 'N/A',
                        status: e.status,
                        instructorApproval: e.instructorApproval,
                        instructorRemarks: e.instructorRemarks,
                        advisorApproval: e.advisorApproval,
                        advisorRemarks: e.advisorRemarks,
                        createdAt: e.createdAt,
                        updatedAt: e.updatedAt,
                    }));
                    setRequests(enrichedRequests);
                }
            }
        } catch (error) {
            console.error('Error fetching instructor data:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown technical error';
            toast({
                title: 'Error Loading Dashboard',
                description: `Failed to load dashboard data: ${errorMessage}`,
                variant: 'destructive',
            });
        }
        setIsLoading(false);
    }, [user?.id, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleEnrollAsInstructor = async (courseId: string) => {
        if (!user?.id) return;
        setIsProcessing(true);
        try {
            const result = await instructorCoursesAPI.enroll(user.id, courseId);
            if (result.success) {
                toast({
                    title: 'Success',
                    description: 'Successfully enrolled as instructor for this course',
                });
                fetchData();
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to enroll',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Enrollment error:', error);
        }
        setIsProcessing(false);
    };

    const handleApprove = async (requestId: string, remarks: string) => {
        setIsProcessing(true);
        const result = await enrollmentsAPI.instructorAction(requestId, 'approve', remarks);
        if (result.success) {
            toast({
                title: 'Request Approved',
                description: 'The enrollment request has been sent to the branch advisor.',
            });
            fetchData();
        } else {
            toast({
                title: 'Error',
                description: result.error || 'Failed to approve request',
                variant: 'destructive',
            });
        }
        setIsProcessing(false);
    };

    const handleReject = async (requestId: string, remarks: string) => {
        setIsProcessing(true);
        const result = await enrollmentsAPI.instructorAction(requestId, 'reject', remarks);
        if (result.success) {
            toast({
                title: 'Request Rejected',
                description: 'The enrollment request has been rejected.',
                variant: 'destructive',
            });
            fetchData();
        } else {
            toast({
                title: 'Error',
                description: result.error || 'Failed to reject request',
                variant: 'destructive',
            });
        }
        setIsProcessing(false);
    };

    const handleSelectRequest = (requestId: string, selected: boolean) => {
        if (selected) {
            setSelectedRequestIds(prev => [...prev, requestId]);
        } else {
            setSelectedRequestIds(prev => prev.filter(id => id !== requestId));
        }
    };

    const handleSelectAllRequests = (selected: boolean) => {
        if (selected) {
            const pendingIds = requests.filter(r => r.status === 'pending_instructor').map(r => r.id);
            setSelectedRequestIds(pendingIds);
        } else {
            setSelectedRequestIds([]);
        }
    };

    const handleBatchAction = async (action: 'approve' | 'reject') => {
        if (selectedRequestIds.length === 0) return;

        setIsProcessing(true);
        try {
            const results = await Promise.all(
                selectedRequestIds.map(id => enrollmentsAPI.instructorAction(id, action, `Batch ${action}d`))
            );

            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;

            if (successCount > 0) {
                toast({
                    title: `Batch ${action === 'approve' ? 'Approval' : 'Rejection'} Complete`,
                    description: `Successfully processed ${successCount} requests.${failCount > 0 ? ` Failed ${failCount} requests.` : ''}`,
                });
                setSelectedRequestIds([]);
                fetchData();
            } else {
                toast({
                    title: 'Batch Action Failed',
                    description: 'Could not process the selected requests.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Batch action error:', error);
        }
        setIsProcessing(false);
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

    const pendingRequests = requests.filter(r => r.status === 'pending_instructor');
    const approvedRequests = requests.filter(r => r.status !== 'pending_instructor' && r.instructorApproval === true);
    const rejectedRequests = requests.filter(r => r.instructorApproval === false);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
                            Instructor Dashboard
                        </h1>
                        <p className="text-muted-foreground">
                            Welcome, {user?.name}! Manage your courses and enrollment requests
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-primary/10">
                                <BookOpen className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{courses.length}</p>
                                <p className="text-xs text-muted-foreground">My Courses</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-accent/10">
                                <BookOpen className="h-5 w-5 text-accent" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{availableCourses.filter(c => !c.isEnrolled).length}</p>
                                <p className="text-xs text-muted-foreground">Available to Teach</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-pending/10">
                                <Clock className="h-5 w-5 text-pending" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{pendingRequests.length}</p>
                                <p className="text-xs text-muted-foreground">Pending Requests</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-success/10">
                                <CheckCircle className="h-5 w-5 text-success" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{approvedRequests.length}</p>
                                <p className="text-xs text-muted-foreground">Approved Students</p>
                            </div>
                        </div>
                    </Card>
                </div>

                <Tabs defaultValue="my-courses" className="space-y-6">
                    <TabsList className="grid w-full max-w-lg grid-cols-3">
                        <TabsTrigger value="my-courses" className="gap-2">
                            <CheckCircle className="h-4 w-4 hidden sm:block" />
                            My Courses
                        </TabsTrigger>
                        <TabsTrigger value="available" className="gap-2">
                            <BookOpen className="h-4 w-4 hidden sm:block" />
                            Find Courses
                        </TabsTrigger>
                        <TabsTrigger value="requests" className="gap-2">
                            <Inbox className="h-4 w-4 hidden sm:block" />
                            Requests
                            {pendingRequests.length > 0 && (
                                <span className="ml-1 px-2 py-0.5 rounded-full bg-pending text-pending-foreground text-xs font-bold">
                                    {pendingRequests.length}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="my-courses" className="animate-fade-in">
                        <Card>
                            <CardHeader>
                                <CardTitle>Courses You Are Teaching</CardTitle>
                                <CardDescription>Manage enrollment and students for your active courses</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {courses.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-muted-foreground mb-4">You haven't enrolled in any courses to teach yet.</p>
                                        <Button variant="outline" onClick={() => {
                                            const tabs = document.querySelectorAll('[role="tab"]');
                                            (tabs[1] as HTMLElement).click();
                                        }}>
                                            Browse Available Courses
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Code</TableHead>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Credits</TableHead>
                                                    <TableHead>Enrolled</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {courses.map((course) => (
                                                    <TableRow key={course.id}>
                                                        <TableCell className="font-mono font-medium">{course.code}</TableCell>
                                                        <TableCell>{course.name}</TableCell>
                                                        <TableCell>{course.credits}</TableCell>
                                                        <TableCell>{course.enrolledCount}/{course.maxSeats}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={course.isOpen ? 'success' : 'secondary'}>
                                                                {course.isOpen ? 'Open' : 'Closed'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="hero"
                                                                size="sm"
                                                                className="gap-1"
                                                                onClick={() => navigate(`/instructor/course/${course.id}`)}
                                                            >
                                                                View Details
                                                                <ExternalLink className="h-3 w-3" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="available" className="animate-fade-in">
                        <Card>
                            <CardHeader>
                                <CardTitle>Available Courses</CardTitle>
                                <CardDescription>Existing courses added by Admin that you can teach this semester</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {availableCourses.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-muted-foreground">No available courses found.</p>
                                    </div>
                                ) : (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Code</TableHead>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Dept</TableHead>
                                                    <TableHead>Credits</TableHead>
                                                    <TableHead className="text-right">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {availableCourses.map((course) => (
                                                    <TableRow key={course.id}>
                                                        <TableCell className="font-mono font-medium">{course.code}</TableCell>
                                                        <TableCell>{course.name}</TableCell>
                                                        <TableCell>{course.department}</TableCell>
                                                        <TableCell>{course.credits}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant={course.isEnrolled ? "secondary" : "default"}
                                                                size="sm"
                                                                disabled={course.isEnrolled || isProcessing}
                                                                onClick={() => handleEnrollAsInstructor(course.id)}
                                                            >
                                                                {course.isEnrolled ? 'Already Teaching' : 'Enroll to Teach'}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="requests" className="animate-fade-in space-y-6">
                        <section className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-pending" />
                                    Pending Action
                                </h2>

                                {pendingRequests.length > 0 && (
                                    <div className="flex items-center gap-4 p-2 bg-muted/40 rounded-lg">
                                        <div className="flex items-center gap-2 px-2">
                                            <Checkbox
                                                id="select-all"
                                                checked={selectedRequestIds.length === pendingRequests.length && pendingRequests.length > 0}
                                                onCheckedChange={(checked) => handleSelectAllRequests(checked as boolean)}
                                            />
                                            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                                                Select All ({pendingRequests.length})
                                            </label>
                                        </div>

                                        {selectedRequestIds.length > 0 && (
                                            <div className="flex items-center gap-2 border-l pl-4 animate-in fade-in zoom-in duration-200">
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    disabled={isProcessing}
                                                    onClick={() => handleBatchAction('approve')}
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                    Approve {selectedRequestIds.length}
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    disabled={isProcessing}
                                                    onClick={() => handleBatchAction('reject')}
                                                >
                                                    <XCircle className="h-4 w-4 mr-1" />
                                                    Reject {selectedRequestIds.length}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {pendingRequests.length === 0 ? (
                                <Card className="p-8 text-center bg-muted/30">
                                    <p className="text-muted-foreground">No pending enrollment requests.</p>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {pendingRequests.map(request => (
                                        <EnrollmentRequestCard
                                            key={request.id}
                                            request={request}
                                            userRole="instructor"
                                            onApprove={handleApprove}
                                            onReject={handleReject}
                                            isProcessing={isProcessing}
                                            selectable={true}
                                            selected={selectedRequestIds.includes(request.id)}
                                            onSelect={handleSelectRequest}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

                        {(approvedRequests.length > 0 || rejectedRequests.length > 0) && (
                            <section className="space-y-4 pt-6 border-t">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-success" />
                                    Processed Requests
                                </h2>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {[...approvedRequests, ...rejectedRequests]
                                        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                                        .slice(0, 6)
                                        .map(request => (
                                            <EnrollmentRequestCard
                                                key={request.id}
                                                request={request}
                                                userRole="instructor"
                                            />
                                        ))}
                                </div>
                            </section>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
};

export default InstructorDashboard;
