import mongoose from 'mongoose';

const instructorCourseSchema = new mongoose.Schema({
    instructorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    semester: {
        type: String,
        required: true,
        default: 'Spring 2026'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Prevent duplicate instructor-course enrollment for same semester
instructorCourseSchema.index({ instructorId: 1, courseId: 1, semester: 1 }, { unique: true });

const InstructorCourse = mongoose.model('InstructorCourse', instructorCourseSchema);

export default InstructorCourse;
