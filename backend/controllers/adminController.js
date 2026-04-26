const User     = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Video    = require('../models/Video');

// GET /api/admin/users  — approved + inactive + legacy users (no status field)
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ status: { $nin: ['pending', 'rejected'] } })
            .select('-password')
            .sort({ createdAt: -1 });

        res.status(200).json({ total: users.length, users });
    } catch (err) {
        console.error('Get all users error:', err.message);
        res.status(500).json({ message: 'Server error fetching users.' });
    }
};

// PUT /api/admin/users/:userId  — edit user details
const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, role, designation, affiliation, phone, purpose } = req.body;

        const user = await User.findByIdAndUpdate(
            userId,
            { name, role, designation, affiliation, phone, purpose },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) return res.status(404).json({ message: 'User not found.' });

        await AuditLog.create({
            userId:   null,
            action:   'UPDATE_USER',
            entity:   'User',
            entityId: userId,
            details:  `User ${user.email} details updated by admin.`,
            status:   'success',
        });

        res.status(200).json({ message: 'User updated successfully.', user });
    } catch (err) {
        console.error('Update user error:', err.message);
        res.status(500).json({ message: 'Server error updating user.' });
    }
};

// DELETE /api/admin/users/:userId
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        await User.findByIdAndDelete(userId);
        await AuditLog.create({
            userId:   null,
            action:   'DELETE_USER',
            entity:   'User',
            entityId: userId,
            details:  `User ${user.email} was deleted.`,
            status:   'success',
        });

        res.status(200).json({ message: 'User deleted successfully.' });
    } catch (err) {
        console.error('Delete user error:', err.message);
        res.status(500).json({ message: 'Server error deleting user.' });
    }
};

// GET /api/admin/logs
const getAuditLogs = async (req, res) => {
    try {
        const logs = await AuditLog.find()
            .populate('userId', 'name email role')
            .sort({ createdAt: -1 });

        res.status(200).json({ total: logs.length, logs });
    } catch (err) {
        console.error('Get audit logs error:', err.message);
        res.status(500).json({ message: 'Server error fetching logs.' });
    }
};

// GET /api/admin/stats
const getStats = async (req, res) => {
    try {
        const totalUsers       = await User.countDocuments({ status: { $nin: ['pending', 'rejected'] } });
        const totalVideos      = await Video.countDocuments();
        const totalDoctors     = await User.countDocuments({ role: 'Doctor',     status: { $nin: ['pending', 'rejected'] } });
        const totalConsultants = await User.countDocuments({ role: 'Consultant', status: { $nin: ['pending', 'rejected'] } });

        res.status(200).json({ totalUsers, totalVideos, totalDoctors, totalConsultants });
    } catch (err) {
        console.error('Get stats error:', err.message);
        res.status(500).json({ message: 'Server error fetching stats.' });
    }
};

// GET /api/admin/charts
const getChartData = async (req, res) => {
    try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const registrations = await User.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        const roles = await User.aggregate([
            { $match: { status: { $nin: ['pending', 'rejected'] } } },
            { $group: { _id: '$role', count: { $sum: 1 } } },
        ]);

        res.status(200).json({ registrations, roles });
    } catch (err) {
        console.error('Get chart data error:', err.message);
        res.status(500).json({ message: 'Server error fetching chart data.' });
    }
};

// GET /api/admin/rejected
const getRejectedUsers = async (req, res) => {
    try {
        const users = await User.find({ status: 'rejected' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.status(200).json({ total: users.length, users });
    } catch (err) {
        console.error('Get rejected users error:', err.message);
        res.status(500).json({ message: 'Server error fetching rejected users.' });
    }
};

// GET /api/admin/pending
const getPendingUsers = async (req, res) => {
    try {
        const users = await User.find({ status: 'pending' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.status(200).json({ total: users.length, users });
    } catch (err) {
        console.error('Get pending users error:', err.message);
        res.status(500).json({ message: 'Server error fetching pending users.' });
    }
};

// PUT /api/admin/users/:userId/approve
const approveUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findByIdAndUpdate(userId, { status: 'approved' }, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found.' });

        await AuditLog.create({ userId: null, action: 'APPROVE_USER', entity: 'User', entityId: userId, details: `User ${user.email} approved.`, status: 'success' });
        res.status(200).json({ message: 'User approved.', user });
    } catch (err) {
        console.error('Approve user error:', err.message);
        res.status(500).json({ message: 'Server error approving user.' });
    }
};

// PUT /api/admin/users/:userId/reject
const rejectUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findByIdAndUpdate(userId, { status: 'rejected' }, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found.' });

        await AuditLog.create({ userId: null, action: 'REJECT_USER', entity: 'User', entityId: userId, details: `User ${user.email} rejected.`, status: 'success' });
        res.status(200).json({ message: 'User rejected.', user });
    } catch (err) {
        console.error('Reject user error:', err.message);
        res.status(500).json({ message: 'Server error rejecting user.' });
    }
};

// PUT /api/admin/users/:userId/deactivate
const deactivateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findByIdAndUpdate(userId, { status: 'inactive' }, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found.' });

        await AuditLog.create({ userId: null, action: 'DEACTIVATE_USER', entity: 'User', entityId: userId, details: `User ${user.email} deactivated.`, status: 'success' });
        res.status(200).json({ message: 'User deactivated.', user });
    } catch (err) {
        console.error('Deactivate user error:', err.message);
        res.status(500).json({ message: 'Server error deactivating user.' });
    }
};

// PUT /api/admin/users/:userId/reactivate
const reactivateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findByIdAndUpdate(userId, { status: 'approved' }, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found.' });

        await AuditLog.create({ userId: null, action: 'REACTIVATE_USER', entity: 'User', entityId: userId, details: `User ${user.email} reactivated.`, status: 'success' });
        res.status(200).json({ message: 'User reactivated.', user });
    } catch (err) {
        console.error('Reactivate user error:', err.message);
        res.status(500).json({ message: 'Server error reactivating user.' });
    }
};

module.exports = {
    getAllUsers, updateUser, deleteUser, getAuditLogs, getStats, getChartData,
    getPendingUsers, getRejectedUsers, approveUser, rejectUser,
    deactivateUser, reactivateUser,
};