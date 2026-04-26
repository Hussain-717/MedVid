const express    = require('express');
const router     = express.Router();
const rateLimit  = require('express-rate-limit');
const { getAllUsers, updateUser, deleteUser, getAuditLogs, getStats, getChartData, getPendingUsers, getRejectedUsers, approveUser, rejectUser, deactivateUser, reactivateUser } = require('../controllers/adminController');
const { adminProtect } = require('../middleware/adminMiddleware');

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: 'Too many admin requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.get('/users',                        adminLimiter, adminProtect, getAllUsers);
router.put('/users/:userId',                adminLimiter, adminProtect, updateUser);
router.delete('/users/:userId',             adminLimiter, adminProtect, deleteUser);
router.get('/logs',                         adminLimiter, adminProtect, getAuditLogs);
router.get('/stats',                        adminLimiter, adminProtect, getStats);
router.get('/charts',                       adminLimiter, adminProtect, getChartData);
router.get('/pending',                      adminLimiter, adminProtect, getPendingUsers);
router.get('/rejected',                     adminLimiter, adminProtect, getRejectedUsers);
router.put('/users/:userId/approve',        adminLimiter, adminProtect, approveUser);
router.put('/users/:userId/reject',         adminLimiter, adminProtect, rejectUser);
router.put('/users/:userId/deactivate',     adminLimiter, adminProtect, deactivateUser);
router.put('/users/:userId/reactivate',     adminLimiter, adminProtect, reactivateUser);

module.exports = router;