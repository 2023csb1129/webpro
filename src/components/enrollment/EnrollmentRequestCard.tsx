import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, User, Mail, BookOpen, Calendar } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

// Flexible interface that works with API data
interface EnrollmentRequestData {
  id: string;
  studentName: string;
  studentEmail: string;
  courseName: string;
  courseCode: string;
  instructorName?: string;
  status: string;
  instructorApproval?: boolean;
  instructorRemarks?: string;
  advisorRemarks?: string;
  createdAt: string | Date;
}

interface EnrollmentRequestCardProps {
  request: EnrollmentRequestData;
  userRole: 'instructor' | 'advisor';
  onApprove?: (requestId: string, remarks: string) => void;
  onReject?: (requestId: string, remarks: string) => void;
  isProcessing?: boolean;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending_instructor':
      return <Badge variant="status-pending">Pending Instructor</Badge>;
    case 'pending_advisor':
      return <Badge variant="status-pending">Pending Advisor</Badge>;
    case 'approved':
      return <Badge variant="status-approved">Approved</Badge>;
    case 'rejected':
      return <Badge variant="status-rejected">Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const EnrollmentRequestCard = ({
  request,
  userRole,
  onApprove,
  onReject,
  isProcessing,
}: EnrollmentRequestCardProps) => {
  const [remarks, setRemarks] = useState('');

  const canTakeAction =
    (userRole === 'instructor' && request.status === 'pending_instructor') ||
    (userRole === 'advisor' && request.status === 'pending_advisor');

  return (
    <Card className="card-hover border border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg font-heading">
              {request.courseName}
            </CardTitle>
            <p className="text-sm text-muted-foreground font-mono">{request.courseCode}</p>
          </div>
          {getStatusBadge(request.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Student Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{request.studentName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{request.studentEmail}</span>
          </div>
        </div>

        {/* Course & Instructor Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {request.instructorName && (
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span>Instructor: {request.instructorName}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Requested: {format(new Date(request.createdAt), 'MMM dd, yyyy')}</span>
          </div>
        </div>

        {/* Previous Remarks */}
        {request.instructorRemarks && userRole === 'advisor' && (
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <p className="text-xs font-medium text-success mb-1">Instructor Remarks</p>
            <p className="text-sm">{request.instructorRemarks}</p>
          </div>
        )}

        {/* Action Section */}
        {canTakeAction && (
          <div className="space-y-3 pt-2 border-t border-border">
            <Textarea
              placeholder="Add remarks (optional)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="resize-none"
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                variant="success"
                className="flex-1"
                onClick={() => onApprove?.(request.id, remarks)}
                disabled={isProcessing}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => onReject?.(request.id, remarks)}
                disabled={isProcessing}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          </div>
        )}

        {/* Show remarks for completed requests */}
        {!canTakeAction && (request.instructorRemarks || request.advisorRemarks) && (
          <div className="space-y-2 pt-2 border-t border-border">
            {request.instructorRemarks && (
              <div className="text-sm">
                <span className="font-medium">Instructor: </span>
                <span className="text-muted-foreground">{request.instructorRemarks}</span>
              </div>
            )}
            {request.advisorRemarks && (
              <div className="text-sm">
                <span className="font-medium">Advisor: </span>
                <span className="text-muted-foreground">{request.advisorRemarks}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnrollmentRequestCard;
