import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
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
import { ArrowLeft, Download, Loader2, Users, BookOpen, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { instructorCoursesAPI, type StudentEnrollmentInfo, type Course } from '@/services/api';

const InstructorCourseDetails = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [course, setCourse] = useState<Course | null>(null);
    const [students, setStudents] = useState<StudentEnrollmentInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchCourseDetails();
    }, [courseId, user?.id]);

    const fetchCourseDetails = async () => {
        if (!courseId || !user?.id) return;

        setIsLoading(true);
        try {
            const result = await instructorCoursesAPI.getCourseStudents(courseId, user.id);
            if (result.success && result.data) {
                setCourse(result.data.course);
                setStudents(result.data.students);
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to fetch course details',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error fetching course details:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch course details',
                variant: 'destructive',
            });
        }
        setIsLoading(false);
    };

    const downloadStudentList = () => {
        if (!course || students.length === 0) {
            toast({
                title: 'No Data',
                description: 'No students to download',
                variant: 'destructive',
            });
            return;
        }

        // Create CSV content
        const headers = ['Name', 'Email', 'Department', 'Status', 'Enrolled At'];
        const rows = students.map(student => [
            student.name,
            student.email,
            student.department,
            student.status,
            new Date(student.enrolledAt).toLocaleDateString(),
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${course.code}_students_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: 'Success',
            description: 'Student list downloaded successfully',
        });
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
            pending_instructor: { label: 'Pending Instructor', variant: 'outline' },
            pending_advisor: { label: 'Pending Advisor', variant: 'secondary' },
            approved: { label: 'Approved', variant: 'default' },
            rejected: { label: 'Rejected', variant: 'destructive' },
            withdrawn: { label: 'Withdrawn', variant: 'outline' },
        };

        const config = statusConfig[status] || { label: status, variant: 'outline' };
        return <Badge variant={config.variant}>{config.label}</Badge>;
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

    if (!course) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                    <p className="text-muted-foreground">Course not found</p>
                    <Button onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    const approvedStudents = students.filter(s => s.status === 'approved');
    const pendingStudents = students.filter(s => s.status === 'pending_instructor' || s.status === 'pending_advisor');

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
                                {course.code} - {course.name}
                            </h1>
                            <p className="text-muted-foreground">Course Details & Student List</p>
                        </div>
                    </div>
                    <Button onClick={downloadStudentList} className="gap-2">
                        <Download className="h-4 w-4" />
                        Download Students List
                    </Button>
                </div>

                {/* Course Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-primary/10">
                                    <BookOpen className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{course.credits}</p>
                                    <p className="text-xs text-muted-foreground">Credits</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-success/10">
                                    <Users className="h-5 w-5 text-success" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{approvedStudents.length}</p>
                                    <p className="text-xs text-muted-foreground">Enrolled</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-pending/10">
                                    <Award className="h-5 w-5 text-pending" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{pendingStudents.length}</p>
                                    <p className="text-xs text-muted-foreground">Pending</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-blue-500/10">
                                    <Users className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{course.maxSeats}</p>
                                    <p className="text-xs text-muted-foreground">Max Seats</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Course Description */}
                <Card>
                    <CardHeader>
                        <CardTitle>Course Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            {course.description || 'No description available'}
                        </p>
                        <div className="mt-4 flex gap-4">
                            <div>
                                <span className="text-sm font-medium">Department:</span>
                                <span className="ml-2 text-sm text-muted-foreground">{course.department}</span>
                            </div>
                            <div>
                                <span className="text-sm font-medium">Status:</span>
                                <Badge className="ml-2" variant={course.isOpen ? 'default' : 'secondary'}>
                                    {course.isOpen ? 'Open' : 'Closed'}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Students Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Enrolled Students</CardTitle>
                        <CardDescription>
                            {students.length} student{students.length !== 1 ? 's' : ''} in total
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {students.length === 0 ? (
                            <div className="text-center py-8">
                                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No students enrolled yet</p>
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Department</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Enrolled At</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students.map((student) => (
                                            <TableRow key={student.id}>
                                                <TableCell className="font-medium">{student.name}</TableCell>
                                                <TableCell>{student.email}</TableCell>
                                                <TableCell>{student.department}</TableCell>
                                                <TableCell>{getStatusBadge(student.status)}</TableCell>
                                                <TableCell>
                                                    {new Date(student.enrolledAt).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default InstructorCourseDetails;
