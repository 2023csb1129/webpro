import express from 'express';
import Course from '../models/Course.js';
import User from '../models/User.js';

const router = express.Router();

// Get all courses
router.get('/', async (req, res) => {
    try {
        const courses = await Course.find()
            .populate('instructorId', 'name email')
            .sort({ createdAt: -1 });

        // Transform to match frontend expected format
        const transformedCourses = courses.map(course => ({
            id: course._id,
            code: course.code,
            name: course.name,
            description: course.description,
            credits: course.credits,
            department: course.department,
            instructorId: course.instructorId?._id,
            instructorName: course.instructorId?.name || 'TBA',
            instructorEmail: course.instructorId?.email || '',
            maxSeats: course.maxSeats,
            enrolledCount: course.enrolledCount,
            isOpen: course.isOpen,
            eligibleBranches: course.eligibleBranches || []
        }));

        res.json({ success: true, courses: transformedCourses });
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch courses' });
    }
});

// Get open courses only
router.get('/open', async (req, res) => {
    try {
        const courses = await Course.find({ isOpen: true })
            .populate('instructorId', 'name email')
            .sort({ code: 1 });

        const transformedCourses = courses.map(course => ({
            id: course._id,
            code: course.code,
            name: course.name,
            description: course.description,
            credits: course.credits,
            department: course.department,
            instructorId: course.instructorId?._id,
            instructorName: course.instructorId?.name || 'TBA',
            instructorEmail: course.instructorId?.email || '',
            maxSeats: course.maxSeats,
            enrolledCount: course.enrolledCount,
            isOpen: course.isOpen,
            eligibleBranches: course.eligibleBranches || []
        }));

        res.json({ success: true, courses: transformedCourses });
    } catch (error) {
        console.error('Get open courses error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch courses' });
    }
});

// Get course by ID
router.get('/:id', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('instructorId', 'name email');

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        res.json({
            success: true,
            course: {
                id: course._id,
                code: course.code,
                name: course.name,
                description: course.description,
                credits: course.credits,
                department: course.department,
                instructorId: course.instructorId?._id,
                instructorName: course.instructorId?.name || 'TBA',
                instructorEmail: course.instructorId?.email || '',
                maxSeats: course.maxSeats,
                enrolledCount: course.enrolledCount,
                isOpen: course.isOpen,
                eligibleBranches: course.eligibleBranches || []
            }
        });
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch course' });
    }
});

// Create new course (Admin only)
router.post('/', async (req, res) => {
    try {
        const { code, name, description, credits, department, instructorId, maxSeats } = req.body;

        // Check if course code already exists
        const existingCourse = await Course.findOne({ code: code.toUpperCase() });
        if (existingCourse) {
            return res.status(400).json({ success: false, message: 'Course code already exists' });
        }

        const course = await Course.create({
            code: code.toUpperCase(),
            name,
            description,
            credits,
            department,
            instructorId,
            maxSeats: maxSeats || 60,
            isOpen: true
        });

        res.status(201).json({ success: true, course });
    } catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({ success: false, message: 'Failed to create course' });
    }
});

// Update course
router.put('/:id', async (req, res) => {
    try {
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('instructorId', 'name email');

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        res.json({ success: true, course });
    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({ success: false, message: 'Failed to update course' });
    }
});

// Toggle course open/closed status
router.patch('/:id/toggle-status', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        course.isOpen = !course.isOpen;
        await course.save();

        res.json({ success: true, isOpen: course.isOpen });
    } catch (error) {
        console.error('Toggle course status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update course status' });
    }
});

// Delete course
router.delete('/:id', async (req, res) => {
    try {
        const course = await Course.findByIdAndDelete(req.params.id);

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        res.json({ success: true, message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete course' });
    }
});

export default router;
