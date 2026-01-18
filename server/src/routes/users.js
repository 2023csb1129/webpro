import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// Get all users
router.get('/', async (req, res) => {
    try {
        const { role } = req.query;
        const filter = role ? { role } : {};

        const users = await User.find(filter).select('-__v').sort({ createdAt: -1 });

        res.json({
            success: true,
            users: users.map(u => ({
                id: u._id,
                email: u.email,
                name: u.name,
                role: u.role,
                department: u.department
            }))
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

// Get users by role
router.get('/role/:role', async (req, res) => {
    try {
        const validRoles = ['student', 'instructor', 'advisor', 'admin'];
        const role = req.params.role;

        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        const users = await User.find({ role }).select('-__v');

        res.json({
            success: true,
            users: users.map(u => ({
                id: u._id,
                email: u.email,
                name: u.name,
                role: u.role,
                department: u.department
            }))
        });
    } catch (error) {
        console.error('Get users by role error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

// Create user (Admin)
router.post('/', async (req, res) => {
    try {
        const { email, name, role, department } = req.body;

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const user = await User.create({
            email: email.toLowerCase(),
            name,
            role,
            department: department || 'Computer Science'
        });

        res.status(201).json({
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
        console.error('Create user error:', error);
        res.status(500).json({ success: false, message: 'Failed to create user' });
    }
});

// Update user
router.put('/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
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
        console.error('Update user error:', error);
        res.status(500).json({ success: false, message: 'Failed to update user' });
    }
});

// Delete user
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
});

export default router;
