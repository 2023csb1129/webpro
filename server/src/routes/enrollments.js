import express from 'express';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import { sendEnrollmentNotification } from '../services/emailService.js';

const router = express.Router();

// Create enrollment request (Student)
router.post('/', async (req, res) => {
    try {
        // Create new enrollment
        const { studentId, courseId } = req.body;

        // 1. Get student's department/branch
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // 2. Validate course eligibility for this branch
        const course = await Course.findById(courseId).populate('instructorId', 'name email');
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        const isEligible = course.eligibleBranches.includes(student.department) || course.eligibleBranches.includes('All');
        if (!isEligible) {
            return res.status(403).json({
                success: false,
                message: `This course is not offered to ${student.department} department. Eligible: ${course.eligibleBranches.join(', ')}`
            });
        }

        // 3. Find advisor for the student's branch
        const advisor = await User.findOne({
            role: 'advisor',
            department: student.department,
            isActive: true
        });

        if (!advisor) {
            return res.status(404).json({
                success: false,
                message: `No advisor found for your department (${student.department}). Please contact admin.`
            });
        }

        // Check if course is open and has seats
        if (!course.isOpen) {
            return res.status(400).json({ success: false, message: 'Course is not open for enrollment' });
        }
        if (course.enrolledCount >= course.maxSeats) {
            return res.status(400).json({ success: false, message: 'Course is full' });
        }

        // Check if already enrolled or pending
        let enrollment = await Enrollment.findOne({ studentId, courseId });

        if (enrollment) {
            // If active, block
            if (['pending_instructor', 'pending_advisor', 'approved'].includes(enrollment.status)) {
                return res.status(400).json({
                    success: false,
                    message: `You already have a ${enrollment.status} enrollment for this course`
                });
            }

            // If inactive (withdrawn/rejected), reset to pending
            enrollment.status = 'pending_instructor';
            enrollment.advisorId = advisor._id;

            // Clear previous approvals/remarks
            enrollment.instructorApproval = undefined;
            enrollment.instructorRemarks = '';
            enrollment.instructorActionAt = undefined;

            enrollment.advisorApproval = undefined;
            enrollment.advisorRemarks = '';
            enrollment.advisorActionAt = undefined;

            await enrollment.save();
        } else {
            // Create new enrollment
            enrollment = await Enrollment.create({
                studentId,
                courseId,
                advisorId: advisor._id,
                status: 'pending_instructor'
            });
        }

        // Send email notification to instructor
        if (course.instructorId?.email) {
            await sendEnrollmentNotification(course.instructorId.email, 'request_to_instructor', {
                studentName: student.name,
                studentEmail: student.email,
                courseName: course.name,
                courseCode: course.code
            });
        }

        console.log(`Enrollment created: Student ${student.email} -> Course ${course.code}`);

        res.status(201).json({
            success: true,
            message: 'Enrollment request submitted',
            enrollment
        });
    } catch (error) {
        console.error('Create enrollment error:', error);
        res.status(500).json({ success: false, message: 'Failed to create enrollment request' });
    }
});

// Get enrollments for student
router.get('/student/:studentId', async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ studentId: req.params.studentId })
            .populate('courseId')
            .populate('studentId', 'name email')
            .sort({ createdAt: -1 });

        res.json({ success: true, enrollments });
    } catch (error) {
        console.error('Get student enrollments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch enrollments' });
    }
});

// Get pending requests for instructor
router.get('/instructor/:instructorId', async (req, res) => {
    try {
        // Get courses taught by this instructor
        const courses = await Course.find({ instructorId: req.params.instructorId });
        const courseIds = courses.map(c => c._id);

        // Get enrollments for those courses
        const enrollments = await Enrollment.find({ courseId: { $in: courseIds } })
            .populate('courseId')
            .populate('studentId', 'name email')
            .sort({ createdAt: -1 });

        // Filter out any enrollments where course or student might have been deleted but reference persists
        const validEnrollments = enrollments.filter(e => e.courseId && e.studentId);

        res.json({ success: true, enrollments: validEnrollments });
    } catch (error) {
        console.error('Get instructor enrollments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch enrollments' });
    }
});

// Get pending requests for advisor
router.get('/advisor/:advisorId', async (req, res) => {
    try {
        const enrollments = await Enrollment.find({
            advisorId: req.params.advisorId,
            status: { $in: ['pending_advisor', 'approved', 'rejected'] }
        })
            .populate('courseId')
            .populate('studentId', 'name email')
            .sort({ createdAt: -1 });

        const validEnrollments = enrollments.filter(e => e.courseId && e.studentId);

        res.json({ success: true, enrollments: validEnrollments });
    } catch (error) {
        console.error('Get advisor enrollments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch enrollments' });
    }
});

// Instructor approval/rejection
router.patch('/:id/instructor-action', async (req, res) => {
    try {
        const { action, remarks } = req.body;
        const enrollment = await Enrollment.findById(req.params.id)
            .populate('courseId')
            .populate('studentId', 'name email')
            .populate('advisorId', 'name email');

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        if (enrollment.status !== 'pending_instructor') {
            return res.status(400).json({ success: false, message: 'Cannot modify this enrollment' });
        }

        if (action === 'approve') {
            enrollment.status = 'pending_advisor';
            enrollment.instructorApproval = true;
            enrollment.instructorRemarks = remarks || 'Approved by instructor';
            enrollment.instructorActionAt = new Date();

            // Notify advisor
            if (enrollment.advisorId?.email) {
                await sendEnrollmentNotification(enrollment.advisorId.email, 'request_to_advisor', {
                    studentName: enrollment.studentId.name,
                    courseName: enrollment.courseId.name
                });
            }
        } else if (action === 'reject') {
            enrollment.status = 'rejected';
            enrollment.instructorApproval = false;
            enrollment.instructorRemarks = remarks || 'Rejected by instructor';
            enrollment.instructorActionAt = new Date();

            // Notify student
            await sendEnrollmentNotification(enrollment.studentId.email, 'enrollment_rejected', {
                courseName: enrollment.courseId.name,
                remarks
            });
        }

        await enrollment.save();
        res.json({ success: true, enrollment });
    } catch (error) {
        console.error('Instructor action error:', error);
        res.status(500).json({ success: false, message: 'Failed to process action' });
    }
});

// Advisor approval/rejection
router.patch('/:id/advisor-action', async (req, res) => {
    try {
        const { action, remarks } = req.body;
        const enrollment = await Enrollment.findById(req.params.id)
            .populate('courseId')
            .populate('studentId', 'name email');

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        if (enrollment.status !== 'pending_advisor') {
            return res.status(400).json({ success: false, message: 'Cannot modify this enrollment' });
        }

        if (action === 'approve') {
            enrollment.status = 'approved';
            enrollment.advisorApproval = true;
            enrollment.advisorRemarks = remarks || 'Approved by advisor';
            enrollment.advisorActionAt = new Date();

            // Increment enrolled count
            await Course.findByIdAndUpdate(enrollment.courseId._id, { $inc: { enrolledCount: 1 } });

            // Notify student
            await sendEnrollmentNotification(enrollment.studentId.email, 'enrollment_approved', {
                courseName: enrollment.courseId.name,
                courseCode: enrollment.courseId.code
            });
        } else if (action === 'reject') {
            enrollment.status = 'rejected';
            enrollment.advisorApproval = false;
            enrollment.advisorRemarks = remarks || 'Rejected by advisor';
            enrollment.advisorActionAt = new Date();

            // Notify student
            await sendEnrollmentNotification(enrollment.studentId.email, 'enrollment_rejected', {
                courseName: enrollment.courseId.name,
                remarks
            });
        }

        await enrollment.save();
        res.json({ success: true, enrollment });
    } catch (error) {
        console.error('Advisor action error:', error);
        res.status(500).json({ success: false, message: 'Failed to process action' });
    }
});

// Get all enrollments (Admin)
router.get('/', async (req, res) => {
    try {
        const enrollments = await Enrollment.find()
            .populate('courseId')
            .populate('studentId', 'name email')
            .populate('advisorId', 'name email')
            .sort({ createdAt: -1 });

        res.json({ success: true, enrollments });
    } catch (error) {
        console.error('Get all enrollments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch enrollments' });
    }
});

// Withdraw enrollment (Student)
router.patch('/:id/withdraw', async (req, res) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id)
            .populate('courseId');

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        if (['rejected', 'withdrawn'].includes(enrollment.status)) {
            return res.status(400).json({ success: false, message: 'Enrollment already inactive' });
        }

        // If previously approved, free up the seat
        if (enrollment.status === 'approved') {
            await Course.findByIdAndUpdate(enrollment.courseId._id, { $inc: { enrolledCount: -1 } });
        }

        enrollment.status = 'withdrawn';
        await enrollment.save();

        res.json({ success: true, enrollment });
    } catch (error) {
        console.error('Withdraw enrollment error:', error);
        res.status(500).json({ success: false, message: 'Failed to withdraw enrollment' });
    }
});

export default router;
