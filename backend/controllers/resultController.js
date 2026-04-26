const Video    = require('../models/Video');
const Analysis = require('../models/Analysis');
const Patient  = require('../models/patient');

const getResults = async (req, res) => {
    try {
        const { videoId } = req.params;

        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({ message: 'Video not found.' });
        }

        // Ensure the video belongs to the requesting user
        if (video.uploadedBy.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Not authorised to view this record.' });
        }

        const analysis = await Analysis.findOne({ videoId });
        if (!analysis) {
            return res.status(404).json({ message: 'Analysis not found.' });
        }

        let patientAge    = 'N/A';
        let patientGender = 'N/A';

        if (video.patientId) {
            const patient = await Patient.findById(video.patientId);
            if (patient) {
                patientAge    = patient.age    ?? 'N/A';
                patientGender = patient.gender ?? 'N/A';
            }
        }

        res.status(200).json({
            videoId:         video._id,
            filename:        video.originalName,
            patientName:     video.patientName,
            patientId:       video.patientId,
            patientAge,
            patientGender,
            uploadedAt:      video.uploadedAt,
            status:          analysis.status,
            detections:      analysis.detections      || [],
            reportSummary:   analysis.reportSummary   || '',
            topSeverity:     analysis.topSeverity     || 'None',
            totalDetections: analysis.totalDetections || 0,
            processedAt:     analysis.processedAt,
            runtimeSeconds:  analysis.runtimeSeconds  || 0,
            clipUrl:         analysis.clipUrl         || null,
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error fetching results.' });
    }
};

module.exports = { getResults };
