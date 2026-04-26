const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        default: 0
    },
    gender: {
        type: String,
        default: 'Unknown'
    },
    phone: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.models.Patient || mongoose.model('Patient', PatientSchema);
