import express from 'express';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import { generateOTP, sendOTPEmail } from '../services/emailService.js';

const router = express.Router();

// Check if user exists and get their role (for login flow)
router.get('/check-user/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email.toLowerCase() });

        if (user) {
            res.json({
                success: true,
                exists: true,
                role: user.role,
                name: user.name
            });
        } else {
            // New user - will be registered as student
            res.json({
                success: true,
                exists: false,
                defaultRole: 'student'
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to check user' });
    }
});

// Send OTP to email (simplified - no role required)
router.post('/send-otp', async (req, res) => {
    try {
        const { email, name } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Delete any existing OTP for this email
        await OTP.deleteMany({ email: email.toLowerCase() });

        // Generate new OTP
        const otp = generateOTP();

        // Save OTP to database
        await OTP.create({
            email: email.toLowerCase(),
            otp: otp,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        });

        // Send OTP via email
        await sendOTPEmail(email, otp);

        // Check if user exists to inform frontend
        const existingUser = await User.findOne({ email: email.toLowerCase() });

        res.json({
            success: true,
            message: 'OTP sent successfully',
            userExists: !!existingUser,
            role: existingUser?.role
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP'
        });
    }
});

// Verify OTP and login
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp, name } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        // Find OTP record
        const otpRecord = await OTP.findOne({
            email: email.toLowerCase(),
            isUsed: false,
            expiresAt: { $gt: new Date() }
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired or not found. Please request a new OTP.'
            });
        }

        // Verify OTP
        const isValid = await otpRecord.verifyOTP(otp);

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP. Please try again.'
            });
        }

        // Mark OTP as used
        otpRecord.isUsed = true;
        await otpRecord.save();

        // Find or create user
        let user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            // NEW USER - Register as STUDENT by default
            user = await User.create({
                email: email.toLowerCase(),
                name: name || email.split('@')[0],
                role: 'student',  // Default role for new users
                department: 'General'
            });
        }

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                department: user.department
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Verification failed'
        });
    }
});

// Get user by email
router.get('/user/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email.toLowerCase() });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                department: user.department
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get user'
        });
    }
});

export default router;
