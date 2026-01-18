export type UserRole = 'student' | 'instructor' | 'advisor' | 'admin';

export type EnrollmentStatus = 'pending_instructor' | 'pending_advisor' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
  credits: number;
  department: string;
  instructorId: string;
  instructorName: string;
  instructorEmail: string;
  maxSeats: number;
  enrolledCount: number;
  isOpen: boolean;
}

export interface EnrollmentRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  instructorId: string;
  instructorName: string;
  advisorId: string;
  advisorName: string;
  status: EnrollmentStatus;
  instructorApproval?: boolean;
  advisorApproval?: boolean;
  instructorRemarks?: string;
  advisorRemarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OTPRequest {
  email: string;
  otp: string;
  expiresAt: Date;
}
