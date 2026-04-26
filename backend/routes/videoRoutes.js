const express = require('express');
const router = express.Router();
const { uploadVideo, analyzeVideo, getHistory, deleteVideo } = require('../controllers/videoController');
const { protect } = require('../middleware/authmiddleware');
const upload = require('../middleware/uploadMiddleware');

// All routes are protected
router.post('/upload',          protect, upload.single('video'), uploadVideo);
router.post('/analyze/:videoId', protect, analyzeVideo);
router.get('/history',           protect, getHistory);
router.delete('/:videoId',       protect, deleteVideo);

module.exports = router;