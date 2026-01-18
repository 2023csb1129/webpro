import express from 'express';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import { sendEnrollmentNotification } from '../services/emailService.js';

const router = express.Router();

// Create enrollment request (Student)
router.post('/', async (req, res) => {
    try {
        const { studentId, courseId, advisorId } = req.body;

        // Check if course exists and is open
        const course = await Course.findById(courseId).populate('instructorId', 'name email');
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        if (!course.isOpen) {
            return res.status(400).json({ success: false, message: 'Course is not open for enrollment' });
        }
        if (course.enrolledCount >= course.maxSeats) {
            return res.status(400).json({ success: false, message: 'Course is full' });
        }

        // Check if already enrolled or pending
        const existingEnrollment = await Enrollment.findOne({ studentId, courseId });
        if (existingEnrollment) {
            return res.status(400).json({
                success: false,
                message: `You already have a ${existingEnrollment.status} enrollment for this course`
            });
        }

        // Get student info
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // Create enrollment
        const enrollment = await Enrollment.create({
            studentId,
            courseId,
            advisorId,
            status: 'pending_instructor'
        });

        // Send email notification to instructor
        if (course.instructorId?.email) {
            await sendEnrollmentNotification(course.instructorId.email, 'request_to_instructor', {
                studentName: student.name,
                studentEmail: student.email,
                courseName: course.name,
                courseCode: course.code
            });
        }

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

        res.json({ success: true, enrollments });
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

        res.json({ success: true, enrollments });
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

export default router;
