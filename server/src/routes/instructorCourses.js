import express from 'express';
import InstructorCourse from '../models/InstructorCourse.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import User from '../models/User.js';

const router = express.Router();

// Get all courses available for instructor enrollment (courses added by admin)
router.get('/available', async (req, res) => {
    try {
        const { instructorId, semester = 'Spring 2026' } = req.query;

        if (!instructorId) {
            return res.status(400).json({ success: false, message: 'Instructor ID is required' });
        }

        // Get all courses
        const allCourses = await Course.find({ isOpen: true })
            .populate('instructorId', 'name email')
            .sort({ code: 1 });

        // Get courses already enrolled by this instructor
        const enrolledCourses = await InstructorCourse.find({
            instructorId,
            semester,
            isActive: true
        }).select('courseId');

        const enrolledCourseIds = enrolledCourses.map(ec => ec.courseId.toString());

        // Filter out already enrolled courses
        const availableCourses = allCourses
            .filter(course => course !== null) // Safety check
            .map(course => ({
                id: course._id,
                code: course.code,
                name: course.name,
                description: course.description,
                credits: course.credits,
                department: course.department,
                maxSeats: course.maxSeats,
                enrolledCount: course.enrolledCount,
                eligibleBranches: course.eligibleBranches || [],
                isEnrolled: enrolledCourseIds.includes(course._id.toString())
            }));

        res.json({ success: true, courses: availableCourses });
    } catch (error) {
        console.error('Get available courses error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch available courses' });
    }
});

// Enroll instructor in a course
router.post('/enroll', async (req, res) => {
    try {
        const { instructorId, courseId, semester = 'Spring 2026' } = req.body;

        if (!instructorId || !courseId) {
            return res.status(400).json({ success: false, message: 'Instructor ID and Course ID are required' });
        }

        // Check if course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Check if instructor exists
        const instructor = await User.findById(instructorId);
        if (!instructor || instructor.role !== 'instructor') {
            return res.status(404).json({ success: false, message: 'Instructor not found' });
        }

        // Check if already enrolled
        const existingEnrollment = await InstructorCourse.findOne({
            instructorId,
            courseId,
            semester
        });

        if (existingEnrollment) {
            if (existingEnrollment.isActive) {
                return res.status(400).json({ success: false, message: 'Already enrolled in this course' });
            } else {
                // Reactivate enrollment
                existingEnrollment.isActive = true;
                await existingEnrollment.save();
                return res.json({ success: true, message: 'Re-enrolled in course successfully', enrollment: existingEnrollment });
            }
        }

        // Create new enrollment
        const enrollment = await InstructorCourse.create({
            instructorId,
            courseId,
            semester
        });

        // Also update the instructorId in the Course model so student requests go to this instructor
        await Course.findByIdAndUpdate(courseId, { instructorId });

        res.status(201).json({ success: true, message: 'Enrolled in course successfully', enrollment });
    } catch (error) {
        console.error('Enroll instructor error:', error);
        res.status(500).json({ success: false, message: 'Failed to enroll in course' });
    }
});

// Get courses enrolled by instructor
router.get('/my-courses', async (req, res) => {
    try {
        const { instructorId, semester = 'Spring 2026' } = req.query;

        if (!instructorId) {
            return res.status(400).json({ success: false, message: 'Instructor ID is required' });
        }

        const enrollments = await InstructorCourse.find({
            instructorId,
            semester,
            isActive: true
        })
            .populate('courseId')
            .sort({ createdAt: -1 });

        const courses = enrollments
            .filter(enrollment => enrollment.courseId !== null) // Skip if course was deleted
            .map(enrollment => ({
                id: enrollment.courseId._id,
                enrollmentId: enrollment._id,
                code: enrollment.courseId.code,
                name: enrollment.courseId.name,
                description: enrollment.courseId.description,
                credits: enrollment.courseId.credits,
                department: enrollment.courseId.department,
                maxSeats: enrollment.courseId.maxSeats,
                enrolledCount: enrollment.courseId.enrolledCount,
                isOpen: enrollment.courseId.isOpen,
                eligibleBranches: enrollment.courseId.eligibleBranches || [],
                enrolledAt: enrollment.createdAt
            }));

        res.json({ success: true, courses });
    } catch (error) {
        console.error('Get my courses error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch enrolled courses' });
    }
});

// Get course details with enrolled students
router.get('/course/:courseId/students', async (req, res) => {
    try {
        const { courseId } = req.params;
        const { instructorId } = req.query;

        if (!instructorId) {
            return res.status(400).json({ success: false, message: 'Instructor ID is required' });
        }

        // Verify instructor is enrolled in this course
        const instructorEnrollment = await InstructorCourse.findOne({
            instructorId,
            courseId,
            isActive: true
        });

        if (!instructorEnrollment) {
            return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
        }

        // Get course details
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Get all enrollments for this course
        const enrollments = await Enrollment.find({ courseId })
            .populate('studentId', 'name email department')
            .sort({ status: 1, createdAt: -1 });

        const students = enrollments
            .filter(enrollment => enrollment.studentId !== null) // Skip if student was deleted
            .map(enrollment => ({
                id: enrollment.studentId._id,
                name: enrollment.studentId.name,
                email: enrollment.studentId.email,
                department: enrollment.studentId.department,
                status: enrollment.status,
                enrolledAt: enrollment.createdAt,
                instructorApproval: enrollment.instructorApproval,
                advisorApproval: enrollment.advisorApproval
            }));

        res.json({
            success: true,
            course: {
                id: course._id,
                code: course.code,
                name: course.name,
                description: course.description,
                credits: course.credits,
                department: course.department,
                maxSeats: course.maxSeats,
                enrolledCount: course.enrolledCount,
                isOpen: course.isOpen,
                eligibleBranches: course.eligibleBranches || []
            },
            students
        });
    } catch (error) {
        console.error('Get course students error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch course students' });
    }
});

// Unenroll instructor from a course
router.delete('/unenroll/:enrollmentId', async (req, res) => {
    try {
        const { enrollmentId } = req.params;

        const enrollment = await InstructorCourse.findById(enrollmentId);
        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        enrollment.isActive = false;
        await enrollment.save();

        res.json({ success: true, message: 'Unenrolled from course successfully' });
    } catch (error) {
        console.error('Unenroll instructor error:', error);
        res.status(500).json({ success: false, message: 'Failed to unenroll from course' });
    }
});

export default router;
