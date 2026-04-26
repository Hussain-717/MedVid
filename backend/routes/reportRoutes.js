const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authmiddleware');
const {
    getReport,
    generateReport,
    exportReport,
    downloadReport   // ✅ new
} = require('../controllers/reportController');

router.get('/:videoId',          protect, getReport);
router.post('/:videoId/generate', protect, generateReport);
router.get('/:videoId/export',    protect, exportReport);
router.get('/:videoId/download', protect,  downloadReport);

module.exports = router;