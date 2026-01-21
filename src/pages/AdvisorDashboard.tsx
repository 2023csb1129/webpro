import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EnrollmentRequestCard from '@/components/enrollment/EnrollmentRequestCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, XCircle, Inbox, Users, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { enrollmentsAPI } from '@/services/api';

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

const AdvisorDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const result = await enrollmentsAPI.getForAdvisor(user.id);

      if (result.success && result.data?.enrollments) {
        const enrichedRequests = result.data.enrollments.map((e: any) => ({
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
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const pendingRequests = requests.filter(r => r.status === 'pending_advisor');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected' && r.advisorApproval === false);
  const withdrawnRequests = requests.filter(r => r.status === 'withdrawn');
  const totalStudents = new Set(approvedRequests.map(r => r.studentId)).size;

  const handleApprove = async (requestId: string, remarks: string) => {
    setIsProcessing(true);

    const result = await enrollmentsAPI.advisorAction(requestId, 'approve', remarks);

    if (result.success) {
      toast({
        title: 'Enrollment Confirmed!',
        description: 'The student has been enrolled in the course. A confirmation email will be sent.',
      });
      fetchRequests(); // Refresh the list
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

    const result = await enrollmentsAPI.advisorAction(requestId, 'reject', remarks);

    if (result.success) {
      toast({
        title: 'Request Rejected',
        description: 'The enrollment request has been rejected.',
        variant: 'destructive',
      });
      fetchRequests(); // Refresh the list
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to reject request',
        variant: 'destructive',
      });
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
                Branch Advisor Dashboard
              </h1>
              <p className="text-muted-foreground">
                Welcome, {user?.name}! Final approval for student course enrollments
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => fetchRequests()} title="Refresh Data">
              <Loader2 className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="flex gap-4">
            <Card className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-pending/10">
                  <Clock className="h-5 w-5 text-pending" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingRequests.length}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </Card>
            <Card className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-success/10">
                  <Users className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalStudents}</p>
                  <p className="text-xs text-muted-foreground">Enrolled</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="pending" className="gap-2">
              <Inbox className="h-4 w-4 hidden sm:block" />
              Pending
              {pendingRequests.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-pending text-pending-foreground text-xs">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle className="h-4 w-4 hidden sm:block" />
              Enrolled
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="h-4 w-4 hidden sm:block" />
              Rejected
            </TabsTrigger>
            <TabsTrigger value="withdrawn" className="gap-2">
              <Inbox className="h-4 w-4 hidden sm:block grayscale" />
              Withdrawn
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 animate-fade-in">
            {pendingRequests.length === 0 ? (
              <Card className="p-8 text-center">
                <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending requests at the moment.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Requests will appear here after instructors approve them.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pendingRequests.map(request => (
                  <EnrollmentRequestCard
                    key={request.id}
                    request={request}
                    userRole="advisor"
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isProcessing={isProcessing}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4 animate-fade-in">
            {approvedRequests.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No enrolled students yet.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {approvedRequests.map(request => (
                  <EnrollmentRequestCard
                    key={request.id}
                    request={request}
                    userRole="advisor"
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4 animate-fade-in">
            {rejectedRequests.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No rejected requests.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {rejectedRequests.map(request => (
                  <EnrollmentRequestCard
                    key={request.id}
                    request={request}
                    userRole="advisor"
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="withdrawn" className="space-y-4 animate-fade-in">
            {withdrawnRequests.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No withdrawn requests.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {withdrawnRequests.map(request => (
                  <EnrollmentRequestCard
                    key={request.id}
                    request={request}
                    userRole="advisor"
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdvisorDashboard;
