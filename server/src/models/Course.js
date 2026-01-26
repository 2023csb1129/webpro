import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    credits: {
        type: Number,
        required: true,
        min: 1,
        max: 6
    },
    department: {
        type: String,
        required: true
    },
    instructorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    maxSeats: {
        type: Number,
        required: true,
        default: 60
    },
    enrolledCount: {
        type: Number,
        default: 0
    },
    isOpen: {
        type: Boolean,
        default: true
    },
    eligibleBranches: {
        type: [String],
        default: ['CSE'] // Default to CSE
    }
}, {
    timestamps: true
});

// Virtual to check if course is full
courseSchema.virtual('isFull').get(function () {
    return this.enrolledCount >= this.maxSeats;
});

// Virtual to get available seats
courseSchema.virtual('availableSeats').get(function () {
    return this.maxSeats - this.enrolledCount;
});

courseSchema.set('toJSON', { virtuals: true });

const Course = mongoose.model('Course', courseSchema);

export default Course;
