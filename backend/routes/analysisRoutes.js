const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const { protect } = require('../middleware/authmiddleware');
const { getAllPatients, uploadAndAnalyze } = require('../controllers/analysisController');

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const safeName = file.originalname.replace(/\s+/g, '-');
        cb(null, Date.now() + '-' + safeName);
    }
});

const upload = multer({ storage: storage });

router.get('/patients', protect, getAllPatients);
router.post('/upload', protect, upload.single('video'), uploadAndAnalyze);

module.exports = router;