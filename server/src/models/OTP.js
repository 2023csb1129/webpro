import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    otp: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
    },
    isUsed: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Hash OTP before saving
otpSchema.pre('save', async function (next) {
    if (this.isModified('otp')) {
        this.otp = await bcrypt.hash(this.otp, 10);
    }
    next();
});

// Method to verify OTP
otpSchema.methods.verifyOTP = async function (inputOtp) {
    return await bcrypt.compare(inputOtp, this.otp);
};

// Auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;
