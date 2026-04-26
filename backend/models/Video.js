const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
    uploadedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number },
    mimeType: { type: String },
    patientName: { type: String, required: true },
    patientId: { type: String, default: null },
    status: { 
        type: String, 
        enum: ['uploaded', 'processing', 'completed', 'failed'], 
        default: 'uploaded' 
    },
    uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Video || mongoose.model('Video', VideoSchema);
