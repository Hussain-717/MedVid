const express = require('express');
const router  = express.Router();
const {
    getReviewQueue,
    verifyCase,
    rejectCase,
    getConsultantStats,
    getConsultantList,
    streamVideoForConsultant,
    getAuditLogs,
} = require('../controllers/consultantController');
const { protect } = require('../middleware/authmiddleware');

router.get('/queue',                     protect, getReviewQueue);
router.get('/stats',                     protect, getConsultantStats);
router.get('/list',                      protect, getConsultantList);
router.get('/audit-logs',               protect, getAuditLogs);
router.get('/video/:videoId',            protect, streamVideoForConsultant);
router.put('/review/:videoId/verify',    protect, verifyCase);
router.put('/review/:videoId/reject',    protect, rejectCase);

module.exports = router;