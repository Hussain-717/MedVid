const User = require('../models/User');

// GET /api/user/profile
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({
            id:          user._id,
            name:        user.name,
            email:       user.email,
            role:        user.role,
            affiliation: user.affiliation,
            designation: user.designation,
            phone:       user.phone,
            purpose:     user.purpose,
            createdAt:   user.createdAt,
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
};

// PUT /api/user/profile
const updateProfile = async (req, res) => {
    try {
        const { name, phone, purpose } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { name, phone, purpose },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({
            message: 'Profile updated successfully.',
            user: {
                id:          user._id,
                name:        user.name,
                email:       user.email,
                role:        user.role,
                affiliation: user.affiliation,
                designation: user.designation,
                phone:       user.phone,
                purpose:     user.purpose,
            }
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error updating profile.' });
    }
};

// PUT /api/user/password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Both current and new password are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters.' });
        }

        const user = await User.findById(req.user.id).select('+password');
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect.' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Password changed successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error changing password.' });
    }
};

module.exports = { getProfile, updateProfile, changePassword };