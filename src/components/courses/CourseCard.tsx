import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, BookOpen, Clock } from 'lucide-react';

// Accept any course object that has these properties
interface CourseCardProps {
  course: {
    id: string;
    code: string;
    name: string;
    description?: string;
    credits: number;
    instructorName?: string;
    maxSeats: number;
    enrolledCount: number;
    isOpen: boolean;
    eligibleBranches?: string[];
  };
  onEnroll?: (courseId: string) => void;
  isEnrolling?: boolean;
  showEnrollButton?: boolean;
  isEnrolled?: boolean;
  isPending?: boolean;
  isEligible?: boolean;
}

const CourseCard = ({
  course,
  onEnroll,
  isEnrolling,
  showEnrollButton = true,
  isEnrolled = false,
  isPending = false,
  isEligible = true,
}: CourseCardProps) => {
  const availableSeats = course.maxSeats - course.enrolledCount;
  const isFull = availableSeats <= 0;

  return (
    <Card className="h-full card-hover border border-border/60 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                {course.code}
              </Badge>
              <Badge variant="outline">{course.credits} Credits</Badge>
            </div>
            <CardTitle className="text-lg font-heading leading-tight">
              {course.name}
            </CardTitle>
          </div>
          {!course.isOpen && (
            <Badge variant="destructive" className="shrink-0">Closed</Badge>
          )}
          {isEnrolled && (
            <Badge variant="success" className="shrink-0">Enrolled</Badge>
          )}
          {isPending && (
            <Badge variant="status-pending" className="shrink-0">Pending</Badge>
          )}
          {!isEligible && (
            <Badge variant="secondary" className="shrink-0 opacity-70">Not Offered</Badge>
          )}
        </div>
        <CardDescription className="line-clamp-2 text-sm">
          {course.description}
        </CardDescription>
        {course.eligibleBranches && (
          <div className="flex flex-wrap gap-1 mt-2">
            {course.eligibleBranches.map(branch => (
              <Badge key={branch} variant="outline" className="text-[10px] py-0 h-4 bg-muted/50">
                {branch}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>{course.instructorName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {course.enrolledCount}/{course.maxSeats} enrolled
              {!isFull && (
                <span className="text-success ml-1">
                  ({availableSeats} seats available)
                </span>
              )}
              {isFull && (
                <span className="text-destructive ml-1">(Full)</span>
              )}
            </span>
          </div>

          {showEnrollButton && !isEnrolled && !isPending && (
            <Button
              className="w-full mt-2"
              variant={course.isOpen && !isFull && isEligible ? "hero" : "secondary"}
              disabled={!course.isOpen || isFull || isEnrolling || !isEligible}
              onClick={() => onEnroll?.(course.id)}
            >
              {isEnrolling ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Requesting...
                </>
              ) : isFull ? (
                'Course Full'
              ) : !course.isOpen ? (
                'Enrollment Closed'
              ) : !isEligible ? (
                'Not Offered to your Branch'
              ) : (
                'Request Enrollment'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseCard;
