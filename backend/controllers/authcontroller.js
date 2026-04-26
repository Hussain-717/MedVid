const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate real JWT token
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' } // Token expires in 7 days
    );
};

// SIGNUP
const signup = async (req, res) => {
    const { name, email, password, role, affiliation, designation, phone, purpose } = req.body;

    if (!name || !email || !password || !role || password.length < 6) {
        return res.status(400).json({ message: 'Invalid or missing required fields.' });
    }

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User with that email already exists.' });
        }

        user = new User({
            name,
            email,
            password,
            role,
            affiliation: affiliation || null,
            designation: designation || null,
            phone:       phone || null,
            purpose:     purpose || null,
        });

        await user.save();

        res.status(201).json({
            message: 'Registration successful! Please log in.',
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });

    } catch (err) {
        console.error("Signup error:", err.message);

        if (err.code === 11000) {
            return res.status(400).json({ message: 'User with that email already exists.' });
        }

        res.status(500).json({ message: 'Server error during signup.' });
    }
};

// LOGIN
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please enter both email and password.' });
    }

    try {
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        if (user.status === 'pending') {
            return res.status(403).json({ message: 'Your account is awaiting admin approval.' });
        }
        if (user.status === 'rejected') {
            return res.status(403).json({ message: 'Your registration was rejected. Please contact support.' });
        }
        if (user.status === 'inactive') {
            return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
        }

        const safeUser = {
            id:    user._id,
            name:  user.name,
            email: user.email,
            role:  user.role
        };

        res.status(200).json({
            message: 'Login successful.',
            token: generateToken(user), // ✅ Real JWT now!
            user: safeUser
        });

    } catch (err) {
        console.error("Login error:", err.message);
        res.status(500).json({ message: 'Server error during login.' });
    }
};

module.exports = { signup, login };