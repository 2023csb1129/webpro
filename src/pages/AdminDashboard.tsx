import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { mockCourses, mockInstructors, mockAdvisors, mockStudents } from '@/data/mockData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  BookOpen, 
  Users, 
  UserCheck, 
  Plus, 
  Pencil, 
  Trash2, 
  GraduationCap,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Course, User } from '@/types';

const AdminDashboard = () => {
  const [courses, setCourses] = useState(mockCourses);
  const [instructors] = useState(mockInstructors);
  const [advisors] = useState(mockAdvisors);
  const [students] = useState(mockStudents);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const { toast } = useToast();

  const handleAddCourse = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newCourse: Course = {
      id: `course-${Date.now()}`,
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      credits: parseInt(formData.get('credits') as string),
      department: formData.get('department') as string,
      instructorId: formData.get('instructor') as string,
      instructorName: instructors.find(i => i.id === formData.get('instructor'))?.name || '',
      instructorEmail: instructors.find(i => i.id === formData.get('instructor'))?.email || '',
      maxSeats: parseInt(formData.get('maxSeats') as string),
      enrolledCount: 0,
      isOpen: true,
    };
    
    setCourses(prev => [...prev, newCourse]);
    setIsAddCourseOpen(false);
    
    toast({
      title: 'Course Added',
      description: `${newCourse.name} has been added successfully.`,
    });
  };

  const handleDeleteCourse = (courseId: string) => {
    setCourses(prev => prev.filter(c => c.id !== courseId));
    toast({
      title: 'Course Deleted',
      description: 'The course has been removed.',
      variant: 'destructive',
    });
  };

  const toggleCourseStatus = (courseId: string) => {
    setCourses(prev =>
      prev.map(c =>
        c.id === courseId ? { ...c, isOpen: !c.isOpen } : c
      )
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage courses, instructors, and system settings
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courses.length}</p>
                <p className="text-xs text-muted-foreground">Courses</p>
              </div>
            </div>
          </Card>
          <Card className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-accent/10">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{instructors.length}</p>
                <p className="text-xs text-muted-foreground">Instructors</p>
              </div>
            </div>
          </Card>
          <Card className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-success/10">
                <UserCheck className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{advisors.length}</p>
                <p className="text-xs text-muted-foreground">Advisors</p>
              </div>
            </div>
          </Card>
          <Card className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-pending/10">
                <GraduationCap className="h-5 w-5 text-pending" />
              </div>
              <div>
                <p className="text-2xl font-bold">{students.length}</p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="courses" className="gap-2">
              <BookOpen className="h-4 w-4 hidden sm:block" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="instructors" className="gap-2">
              <Users className="h-4 w-4 hidden sm:block" />
              Instructors
            </TabsTrigger>
            <TabsTrigger value="advisors" className="gap-2">
              <UserCheck className="h-4 w-4 hidden sm:block" />
              Advisors
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-2">
              <GraduationCap className="h-4 w-4 hidden sm:block" />
              Students
            </TabsTrigger>
          </TabsList>

          {/* Courses Tab */}
          <TabsContent value="courses" className="animate-fade-in">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Courses</CardTitle>
                  <CardDescription>Manage all courses in the system</CardDescription>
                </div>
                <Dialog open={isAddCourseOpen} onOpenChange={setIsAddCourseOpen}>
                  <DialogTrigger asChild>
                    <Button variant="hero" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Course</DialogTitle>
                      <DialogDescription>
                        Create a new course for student enrollment
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddCourse} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="code">Course Code</Label>
                          <Input id="code" name="code" placeholder="CS301" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="credits">Credits</Label>
                          <Input id="credits" name="credits" type="number" placeholder="4" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name">Course Name</Label>
                        <Input id="name" name="name" placeholder="Data Structures" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input id="description" name="description" placeholder="Course description" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input id="department" name="department" placeholder="Computer Science" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="instructor">Instructor</Label>
                          <select
                            id="instructor"
                            name="instructor"
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                            required
                          >
                            {instructors.map(instructor => (
                              <option key={instructor.id} value={instructor.id}>
                                {instructor.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxSeats">Max Seats</Label>
                          <Input id="maxSeats" name="maxSeats" type="number" placeholder="60" required />
                        </div>
                      </div>
                      <Button type="submit" className="w-full">
                        Add Course
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Instructor</TableHead>
                        <TableHead>Enrolled</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courses.map(course => (
                        <TableRow key={course.id}>
                          <TableCell className="font-mono">{course.code}</TableCell>
                          <TableCell className="font-medium">{course.name}</TableCell>
                          <TableCell>{course.instructorName}</TableCell>
                          <TableCell>
                            {course.enrolledCount}/{course.maxSeats}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={course.isOpen ? 'success' : 'destructive'}
                              className="cursor-pointer"
                              onClick={() => toggleCourseStatus(course.id)}
                            >
                              {course.isOpen ? 'Open' : 'Closed'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteCourse(course.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Instructors Tab */}
          <TabsContent value="instructors" className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle>Instructors</CardTitle>
                <CardDescription>All course instructors in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instructors.map(instructor => (
                      <TableRow key={instructor.id}>
                        <TableCell className="font-medium">{instructor.name}</TableCell>
                        <TableCell>{instructor.email}</TableCell>
                        <TableCell>{instructor.department}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advisors Tab */}
          <TabsContent value="advisors" className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle>Branch Advisors</CardTitle>
                <CardDescription>All branch advisors in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {advisors.map(advisor => (
                      <TableRow key={advisor.id}>
                        <TableCell className="font-medium">{advisor.name}</TableCell>
                        <TableCell>{advisor.email}</TableCell>
                        <TableCell>{advisor.department}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle>Students</CardTitle>
                <CardDescription>All registered students</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map(student => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>{student.department}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
