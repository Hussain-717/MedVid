const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const { uploadVideo, analyzeVideo, getHistory, deleteVideo, downloadVideo } = require('../controllers/videoController');
const { getVideoThumbnail } = require('../controllers/thumbnailController');
const { protect } = require('../middleware/authmiddleware');
const upload = require('../middleware/uploadMiddleware');

const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

// All routes are protected
router.post('/thumbnail',        protect, memUpload.single('video'), getVideoThumbnail);
router.post('/upload',          protect, upload.single('video'), uploadVideo);
router.post('/analyze/:videoId', protect, analyzeVideo);
router.get('/history',           protect, getHistory);
router.delete('/:videoId',       protect, deleteVideo);
router.get('/:videoId/download',  protect, downloadVideo);

module.exports = router;