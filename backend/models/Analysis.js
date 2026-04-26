const mongoose = require('mongoose');

const DetectionSchema = new mongoose.Schema({
    type:       { type: String },
    location:   { type: String },
    severity:   { type: String },
    confidence: { type: Number },
    time:       { type: Number },
    bbox:       { type: [Number], default: [] },  // ✅ added
});

const AnalysisSchema = new mongoose.Schema({
    videoId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'Video',
        required: true
    },
    status: {
        type:    String,
        enum:    ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    detections:      [DetectionSchema],
    reportSummary:   { type: String,  default: null },
    topSeverity: {
        type:    String,
        enum:    ['Low', 'Medium', 'High', 'None', 'N/A'],  // ✅ added None
        default: 'N/A'
    },
    totalDetections: { type: Number, default: 0 },
    heatmapPath:     { type: String, default: null },
    clipUrl:         { type: String, default: null },  // ✅ added
    runtimeSeconds:  { type: Number, default: null },
    toolVersion:     { type: String, default: 'MedVid-AI-v1.0' },
    processedAt:     { type: Date,   default: null },
    createdAt:       { type: Date,   default: Date.now },
});

// ✅ Prevents OverwriteModelError
module.exports = mongoose.models.Analysis ||
                 mongoose.model('Analysis', AnalysisSchema);