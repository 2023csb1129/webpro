import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    status: {
        type: String,
        enum: ['pending_instructor', 'pending_advisor', 'approved', 'rejected'],
        default: 'pending_instructor'
    },
    // Instructor approval
    instructorApproval: {
        type: Boolean,
        default: null
    },
    instructorRemarks: {
        type: String,
        default: ''
    },
    instructorActionAt: {
        type: Date
    },
    // Advisor approval
    advisorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    advisorApproval: {
        type: Boolean,
        default: null
    },
    advisorRemarks: {
        type: String,
        default: ''
    },
    advisorActionAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Prevent duplicate enrollment requests
enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

export default Enrollment;
