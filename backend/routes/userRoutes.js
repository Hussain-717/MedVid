const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, changePassword } = require('../controllers/userController');
const { protect } = require('../middleware/authmiddleware');

router.get('/profile',  protect, getProfile);
router.put('/profile',  protect, updateProfile);
router.put('/password', protect, changePassword);

module.exports = router;