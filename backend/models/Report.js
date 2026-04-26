const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    videoId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Video', 
        required: true 
    },
    analysisId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Analysis', 
        required: true 
    },
    generatedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    summary: { type: String },
    consultantNotes: { type: String, default: null },
    consultantReviewedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        default: null 
    },
    consultantReviewedAt: { type: Date, default: null },
    pdfPath: { type: String, default: null },  // path to generated PDF
    generatedAt: { type: Date, default: Date.now },

    reviewStatus:    { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, default: null },
});

module.exports = mongoose.models.Report || mongoose.model('Report', ReportSchema);
