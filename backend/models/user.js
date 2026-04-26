const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name:        { type: String, required: true },
    email:       { type: String, required: true, unique: true },
    password:    { type: String, required: true, select: false },
    role:        { type: String, required: true, enum: ['Doctor', 'Hospital', 'Institute', 'Consultant'] },
    affiliation: { type: String, default: null },
    designation: { type: String, default: null },
    phone:       { type: String, default: null },
    purpose:     { type: String, default: null },
    status:      { type: String, enum: ['pending', 'approved', 'rejected', 'inactive'], default: 'pending' },
    createdAt:   { type: Date, default: Date.now },
});

// Hash password before saving
UserSchema.pre('save', async function () {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
});

module.exports = mongoose.model('User', UserSchema);