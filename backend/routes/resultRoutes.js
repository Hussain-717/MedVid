const express = require('express');
const router = express.Router();
const { getResults } = require('../controllers/resultController');
const { protect } = require('../middleware/authmiddleware');

router.get('/:videoId', protect, getResults);

module.exports = router;