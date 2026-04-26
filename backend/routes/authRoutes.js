const express    = require('express');
const router     = express.Router();
const rateLimit  = require('express-rate-limit');
const { signup, login } = require('../controllers/authcontroller');
const { protect } = require('../middleware/authmiddleware');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // 10 attempts per window
    message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,                    // 5 signups per IP per hour
    message: { message: 'Too many accounts created from this IP. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Public routes
router.post('/signup', signupLimiter, signup);
router.post('/login',  loginLimiter,  login);

// Protected route example (requires valid JWT)
router.get('/me', protect, (req, res) => {
    res.status(200).json({ message: 'Token is valid!', user: req.user });
});

module.exports = router;