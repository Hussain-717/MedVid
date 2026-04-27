const Video    = require('../models/Video');
const Analysis = require('../models/Analysis');
const AuditLog = require('../models/AuditLog');
const axios    = require('axios');
const FormData = require('form-data');
const fs       = require('fs');

const FLASK_URL = 'http://localhost:5001';

// POST /api/video/upload
const uploadVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No video file uploaded.' });
        }

        const { patientName, patientId } = req.body;

        if (!patientName) {
            return res.status(400).json({ message: 'Patient name is required.' });
        }

        const video = new Video({
            uploadedBy:   req.user.id,
            filename:     req.file.filename,
            originalName: req.file.originalname,
            filePath:     req.file.path,
            fileSize:     req.file.size,
            mimeType:     req.file.mimetype,
            patientName:  patientName,
            patientId:    patientId || null,
            status:       'uploaded',
        });
        await video.save();

        const analysis = new Analysis({
            videoId: video._id,
            status:  'pending',
        });
        await analysis.save();

        await AuditLog.create({
            userId:   req.user.id,
            action:   'UPLOAD',
            entity:   'Video',
            entityId: video._id.toString(),
            details:  `Video uploaded for patient: ${patientName}`,
            status:   'success',
        });

        res.status(201).json({
            message:     'Video uploaded successfully.',
            videoId:     video._id,
            filename:    video.originalName,
            patientName: video.patientName,
        });

    } catch (err) {
        console.error('Upload error:', err.message);
        res.status(500).json({ message: 'Server error during upload.' });
    }
};

// POST /api/video/analyze/:videoId
const analyzeVideo = async (req, res) => {
    try {
        const { videoId } = req.params;

        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({ message: 'Video not found.' });
        }

        if (video.uploadedBy.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Not authorised to analyze this video.' });
        }

        // Update statuses to processing
        video.status = 'processing';
        await video.save();
        await Analysis.findOneAndUpdate({ videoId }, { status: 'processing' });

        await AuditLog.create({
            userId:   req.user.id,
            action:   'ANALYZE',
            entity:   'Video',
            entityId: videoId,
            details:  `Analysis started for video: ${video.originalName}`,
            status:   'success',
        });

        // Call Flask Model Service
        let aiResult = null;
        try {
            const form = new FormData();
            form.append('video', fs.createReadStream(video.filePath), {
                filename: video.originalName
            });

            const flaskResponse = await axios.post(
                `${FLASK_URL}/analyze`,
                form,
                {
                    headers: form.getHeaders(),
                    timeout: 300000
                }
            );
            aiResult = flaskResponse.data;
        } catch (flaskError) {
            console.error("Flask error:", flaskError.message);
            aiResult = {
                label:       'Analysis Unavailable',
                confidence:  0,
                is_abnormal: false,
                bbox:        [0, 0, 0, 0]
            };
        }

        // Build detections
        const detections = aiResult.is_abnormal ? [
            {
                type:       aiResult.label,
                location:   'GI Tract',
                severity:   aiResult.confidence > 80 ? 'High' : 'Medium',
                confidence: aiResult.confidence / 100,
                bbox:       aiResult.bbox
            }
        ] : [];

        const reportSummary = aiResult.is_abnormal
            ? `AI detected anomaly: ${aiResult.label}. Confidence: ${aiResult.confidence}%.`
            : `No anomalies detected. Confidence: ${aiResult.confidence}%.`;

        // Compute top severity from detections
        const severityRank = { High: 3, Medium: 2, Low: 1 };
        let topSeverity = 'None';
        detections.forEach(d => {
            if ((severityRank[d.severity] || 0) > (severityRank[topSeverity] || 0)) {
                topSeverity = d.severity;
            }
        });

        // Update video and analysis
        await Video.findByIdAndUpdate(videoId, { status: 'completed' });
        await Analysis.findOneAndUpdate(
            { videoId },
            {
                status:          'completed',
                processedAt:     new Date(),
                totalDetections: detections.length,
                detections:      detections,
                reportSummary:   reportSummary,
                topSeverity:     topSeverity,
            }
        );

        res.status(200).json({
            message:  'Analysis complete.',
            videoId,
            aiResult: aiResult
        });

    } catch (err) {
        console.error('Analysis error:', err.message);
        res.status(500).json({ message: 'Server error during analysis.' });
    }
};

// GET /api/video/history
// GET /api/video/history
const getHistory = async (req, res) => {
    try {
        const {
            page      = 1,
            pageSize  = 10,
            query     = '',
            severity  = '',
            status    = '',
            sortField = 'uploadedAt',
            sortOrder = 'desc',
        } = req.query;

        const pageNum  = parseInt(page,     10);
        const limitNum = parseInt(pageSize, 10);
        const sortDir  = sortOrder === 'asc' ? 1 : -1;

        // Step 1: Build video filter
        const videoFilter = { uploadedBy: req.user.id };
        if (query)  videoFilter.patientName = { $regex: query, $options: 'i' };
        if (status) videoFilter.status = status;

        // Step 2: Fetch ALL matching videos (no pagination yet)
        const allVideos = await Video.find(videoFilter)
            .sort({ [sortField]: sortDir });

        if (allVideos.length === 0) {
            return res.status(200).json({ data: { items: [], total: 0 } });
        }

        // Step 3: Fetch all analyses for these videos
        const videoIds   = allVideos.map(v => v._id);
        const analyses   = await Analysis.find({ videoId: { $in: videoIds } });

        const analysisMap = {};
        analyses.forEach(a => {
            analysisMap[a.videoId.toString()] = a;
        });

        // Step 4: Merge video + analysis data
        const severityRank = { High: 3, Medium: 2, Low: 1, None: 0 };

        let allItems = allVideos.map(video => {
            const analysis   = analysisMap[video._id.toString()];
            const detections = analysis?.detections || [];

            let topSeverity = 'None';
            detections.forEach(d => {
                if ((severityRank[d.severity] || 0) > (severityRank[topSeverity] || 0)) {
                    topSeverity = d.severity;
                }
            });

            return {
                videoId:     video._id,
                patientName: video.patientName || 'Unknown',
                patientId:   video.patientId   || null,
                uploadedAt:  video.uploadedAt,
                status:      video.status,
                topSeverity: detections.length > 0 ? topSeverity : 'None',
                previewFrame: null,
            };
        });

        // Step 5: Apply severity filter BEFORE pagination
        if (severity) {
            allItems = allItems.filter(i => i.topSeverity === severity);
        }

        // Step 6: Now paginate the filtered results
        const total      = allItems.length;
        const skip       = (pageNum - 1) * limitNum;
        const pagedItems = allItems.slice(skip, skip + limitNum);

        res.status(200).json({
            data: { items: pagedItems, total }
        });

    } catch (err) {
        console.error('History error:', err.message);
        res.status(500).json({ message: 'Server error fetching history.' });
    }
};

// DELETE /api/video/:videoId
const deleteVideo = async (req, res) => {
    try {
        const { videoId } = req.params;

        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({ message: 'Video not found.' });
        }

        // Ensure the video belongs to the requesting user
        if (video.uploadedBy.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Not authorised to delete this record.' });
        }

        // Delete physical file if it exists
        if (video.filePath && fs.existsSync(video.filePath)) {
            fs.unlinkSync(video.filePath);
        }

        await Analysis.deleteOne({ videoId: video._id });
        await Video.deleteOne({ _id: video._id });

        await AuditLog.create({
            userId:   req.user.id,
            action:   'DELETE',
            entity:   'Video',
            entityId: videoId,
            details:  `Video deleted for patient: ${video.patientName}`,
            status:   'success',
        });

        res.status(200).json({ message: 'Record deleted successfully.' });

    } catch (err) {
        res.status(500).json({ message: 'Server error during deletion.' });
    }
};

// GET /api/video/:videoId/download
const downloadVideo = async (req, res) => {
    try {
        const { videoId } = req.params;
        const video = await Video.findById(videoId);
        if (!video) return res.status(404).json({ message: 'Video not found.' });
        if (video.uploadedBy.toString() !== req.user.id.toString())
            return res.status(403).json({ message: 'Not authorised.' });
        if (!video.filePath || !fs.existsSync(video.filePath))
            return res.status(404).json({ message: 'Video file not found on server.' });

        res.setHeader('Content-Disposition', `attachment; filename="${video.originalName}"`);
        res.setHeader('Content-Type', video.mimeType || 'video/mp4');
        fs.createReadStream(video.filePath).pipe(res);
    } catch (err) {
        res.status(500).json({ message: 'Server error during video download.' });
    }
};

module.exports = { uploadVideo, analyzeVideo, getHistory, deleteVideo, downloadVideo };
