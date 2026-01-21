import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { coursesAPI, usersAPI, Course, User } from '@/services/api';
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
const AdminDashboard = () => {
  const { toast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [advisors, setAdvisors] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [isAddInstructorOpen, setIsAddInstructorOpen] = useState(false);
  const [isAddAdvisorOpen, setIsAddAdvisorOpen] = useState(false);

  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch courses
      const coursesRes = await coursesAPI.getAll();
      if (coursesRes.success && coursesRes.data?.courses) {
        setCourses(coursesRes.data.courses);
      }

      // Fetch users by role
      const instructorsRes = await usersAPI.getByRole('instructor');
      if (instructorsRes.success && instructorsRes.data?.users) {
        setInstructors(instructorsRes.data.users);
      }

      const advisorsRes = await usersAPI.getByRole('advisor');
      if (advisorsRes.success && advisorsRes.data?.users) {
        setAdvisors(advisorsRes.data.users);
      }

      const studentsRes = await usersAPI.getByRole('student');
      if (studentsRes.success && studentsRes.data?.users) {
        setStudents(studentsRes.data.users);
      }
    } catch (error) {
      console.error('Failed to fetch admin data', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const result = await coursesAPI.create({
        code: formData.get('code') as string,
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        credits: parseInt(formData.get('credits') as string),
        department: formData.get('department') as string,
        instructorId: formData.get('instructor') as string,
        maxSeats: parseInt(formData.get('maxSeats') as string),
      });

      if (result.success) {
        toast({
          title: 'Course Added',
          description: 'Course has been added successfully.',
        });
        setIsAddCourseOpen(false);
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add course',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>, role: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const result = await usersAPI.create({
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        department: formData.get('department') as string,
        role: role
      });

      if (result.success) {
        toast({
          title: 'User Added',
          description: `${role.charAt(0).toUpperCase() + role.slice(1)} added successfully.`,
        });
        if (role === 'instructor') setIsAddInstructorOpen(false);
        if (role === 'advisor') setIsAddAdvisorOpen(false);
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add user',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    const result = await coursesAPI.delete(courseId);
    if (result.success) {
      setCourses(prev => prev.filter(c => c.id !== courseId));
      toast({
        title: 'Course Deleted',
        description: 'The course has been removed.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to delete course',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId: string, role: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const result = await usersAPI.delete(userId);
      if (result.success) {
        if (role === 'instructor') setInstructors(prev => prev.filter(u => u.id !== userId));
        if (role === 'advisor') setAdvisors(prev => prev.filter(u => u.id !== userId));
        if (role === 'student') setStudents(prev => prev.filter(u => u.id !== userId));

        toast({
          title: 'User Deleted',
          description: 'The user has been removed successfully.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete user',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'An error occurred while deleting the user.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCourse) return;

    const formData = new FormData(e.currentTarget);

    try {
      const result = await coursesAPI.update(editingCourse.id, {
        code: formData.get('code') as string,
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        credits: parseInt(formData.get('credits') as string),
        department: formData.get('department') as string,
        instructorId: formData.get('instructor') as string,
        maxSeats: parseInt(formData.get('maxSeats') as string),
      });

      if (result.success) {
        toast({
          title: 'Course Updated',
          description: 'Course details have been updated.',
        });
        setEditingCourse(null);
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update course',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(e.currentTarget);

    try {
      const result = await usersAPI.update(editingUser.id, {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        department: formData.get('department') as string,
      });

      if (result.success) {
        toast({
          title: 'User Updated',
          description: 'User details have been updated.',
        });
        setEditingUser(null);
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update user',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleCourseStatus = async (courseId: string) => {
    const result = await coursesAPI.toggleStatus(courseId);
    if (result.success) {
      fetchData();
    }
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
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingCourse(course)}
                              >
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Instructors</CardTitle>
                  <CardDescription>All course instructors in the system</CardDescription>
                </div>
                <Dialog open={isAddInstructorOpen} onOpenChange={setIsAddInstructorOpen}>
                  <DialogTrigger asChild>
                    <Button variant="hero" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Instructor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Instructor</DialogTitle>
                      <DialogDescription>
                        Register a new instructor in the system
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => handleAddUser(e, 'instructor')} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" name="name" placeholder="Dr. Jane Doe" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" name="email" type="email" placeholder="jane.doe@university.edu" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input id="department" name="department" placeholder="Computer Science" defaultValue="Computer Science" required />
                      </div>
                      <Button type="submit" className="w-full">
                        Add Instructor
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instructors.map(instructor => (
                      <TableRow key={instructor.id}>
                        <TableCell className="font-medium">{instructor.name}</TableCell>
                        <TableCell>{instructor.email}</TableCell>
                        <TableCell>{instructor.department}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingUser(instructor)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(instructor.id, 'instructor')}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Branch Advisors</CardTitle>
                  <CardDescription>All branch advisors in the system</CardDescription>
                </div>
                <Dialog open={isAddAdvisorOpen} onOpenChange={setIsAddAdvisorOpen}>
                  <DialogTrigger asChild>
                    <Button variant="hero" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Advisor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Advisor</DialogTitle>
                      <DialogDescription>
                        Register a new branch advisor in the system
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => handleAddUser(e, 'advisor')} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" name="name" placeholder="Prof. John Smith" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" name="email" type="email" placeholder="john.smith@university.edu" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input id="department" name="department" placeholder="Computer Science" defaultValue="Computer Science" required />
                      </div>
                      <Button type="submit" className="w-full">
                        Add Advisor
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {advisors.map(advisor => (
                      <TableRow key={advisor.id}>
                        <TableCell className="font-medium">{advisor.name}</TableCell>
                        <TableCell>{advisor.email}</TableCell>
                        <TableCell>{advisor.department}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingUser(advisor)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(advisor.id, 'advisor')}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
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

      {/* Edit Course Dialog */}
      <Dialog open={!!editingCourse} onOpenChange={(open) => !open && setEditingCourse(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>Update course details</DialogDescription>
          </DialogHeader>
          {editingCourse && (
            <form onSubmit={handleUpdateCourse} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-code">Course Code</Label>
                  <Input id="edit-code" name="code" defaultValue={editingCourse.code} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-credits">Credits</Label>
                  <Input id="edit-credits" name="credits" type="number" defaultValue={editingCourse.credits} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Course Name</Label>
                <Input id="edit-name" name="name" defaultValue={editingCourse.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input id="edit-description" name="description" defaultValue={editingCourse.description} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-department">Department</Label>
                <Input id="edit-department" name="department" defaultValue={editingCourse.department} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-instructor">Instructor</Label>
                  <select
                    id="edit-instructor"
                    name="instructor"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    defaultValue={editingCourse.instructorId || ''}
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
                  <Label htmlFor="edit-maxSeats">Max Seats</Label>
                  <Input id="edit-maxSeats" name="maxSeats" type="number" defaultValue={editingCourse.maxSeats} required />
                </div>
              </div>
              <Button type="submit" className="w-full">Update Course</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit {editingUser?.role ? editingUser.role.charAt(0).toUpperCase() + editingUser.role.slice(1) : 'User'}
            </DialogTitle>
            <DialogDescription>Update user details</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-user-name">Full Name</Label>
                <Input id="edit-user-name" name="name" defaultValue={editingUser.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-email">Email Address</Label>
                <Input id="edit-user-email" name="email" type="email" defaultValue={editingUser.email} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-department">Department</Label>
                <Input id="edit-user-department" name="department" defaultValue={editingUser.department || ''} required />
              </div>
              <Button type="submit" className="w-full">Update User</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminDashboard;
