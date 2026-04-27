const fs       = require('fs');
const path     = require('path');
const { spawn } = require('child_process');
const Video    = require('../models/Video');
const Analysis = require('../models/Analysis');
const Report   = require('../models/Report');
const Patient  = require('../models/patient');
const AuditLog = require('../models/AuditLog');
const ChatMessage = require('../models/ChatMessage');
const User     = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/consultant/queue
// Returns all cases referred to this consultant via chat that need review
// ─────────────────────────────────────────────────────────────────────────────
const getReviewQueue = async (req, res) => {
    try {
        const consultantId = req.user.id;

        // Find all chat messages sent TO this consultant that have a videoId
        const referralMessages = await ChatMessage.find({
            receiverId: consultantId,
            videoId:    { $ne: null },
        })
        .populate('senderId', 'name email')
        .sort({ sentAt: -1 });

        if (referralMessages.length === 0) {
            return res.status(200).json({ total: 0, queue: [] });
        }

        // Deduplicate by videoId (take latest message per video)
        const seenVideoIds = new Set();
        const uniqueReferrals = [];
        for (const msg of referralMessages) {
            const vid = msg.videoId.toString();
            if (!seenVideoIds.has(vid)) {
                seenVideoIds.add(vid);
                uniqueReferrals.push(msg);
            }
        }

        // Build queue items with full case details
        const queue = await Promise.all(uniqueReferrals.map(async (msg) => {
            const videoId = msg.videoId;

            const [video, analysis, report] = await Promise.all([
                Video.findById(videoId),
                Analysis.findOne({ videoId }),
                Report.findOne({ videoId }),
            ]);

            if (!video || !analysis) return null;

            // Get patient age/gender
            let patientAge    = 'N/A';
            let patientGender = 'N/A';
            if (video.patientId) {
                const patient = await Patient.findById(video.patientId);
                if (patient) {
                    patientAge    = patient.age    ?? 'N/A';
                    patientGender = patient.gender ?? 'N/A';
                }
            }

            return {
                videoId:      video._id,
                patientName:  video.patientName  || 'Unknown',
                patientAge,
                patientGender,
                filename:     video.originalName || 'N/A',
                uploadedAt:   video.uploadedAt,
                doctorName:   msg.senderId?.name || 'Unknown Doctor',
                doctorId:     msg.senderId?._id,
                topSeverity:  analysis.topSeverity     || 'None',
                totalDetections: analysis.totalDetections || 0,
                detections:   analysis.detections     || [],
                reportSummary: analysis.reportSummary  || '',
                confidence:   analysis.detections?.[0]?.confidence || 0,
                clipUrl:      analysis.clipUrl         || null,
                reportUrl:    `http://localhost:5000/api/reports/${video._id}/download`,
                reviewStatus: report?.reviewStatus     || 'pending',
                referredAt:   msg.sentAt,
            };
        }));

        const filtered = queue.filter(Boolean);

        res.status(200).json({
            total: filtered.length,
            queue: filtered,
        });

    } catch (err) {
        console.error('Get review queue error:', err.message);
        res.status(500).json({ message: 'Server error fetching review queue.' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/consultant/review/:videoId/verify
// Consultant verifies the case
// ─────────────────────────────────────────────────────────────────────────────
const verifyCase = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { consultantNotes } = req.body;

        const analysis = await Analysis.findOne({ videoId });
        if (!analysis) {
            return res.status(404).json({ message: 'Analysis not found.' });
        }

        // Update or create report
        let report = await Report.findOne({ videoId });
        if (report) {
            report.reviewStatus        = 'verified';
            report.consultantNotes     = consultantNotes || 'Verified by consultant.';
            report.consultantReviewedBy = req.user.id;
            report.consultantReviewedAt = new Date();
            report.rejectionReason     = null;
            await report.save();
        } else {
            report = await Report.create({
                videoId,
                analysisId:              analysis._id,
                generatedBy:             req.user.id,
                summary:                 analysis.reportSummary,
                consultantNotes:         consultantNotes || 'Verified by consultant.',
                consultantReviewedBy:    req.user.id,
                consultantReviewedAt:    new Date(),
                reviewStatus:            'verified',
            });
        }

        // Notify doctor via Socket.IO
        const video        = await Video.findById(videoId);
        const io           = req.app.get('io');
        const onlineUsers  = req.app.get('onlineUsers');
        const doctorSocket = onlineUsers.get(String(video?.uploadedBy));

        if (doctorSocket && io) {
            io.to(doctorSocket).emit('case_reviewed', {
                videoId,
                status:  'verified',
                message: `Your case for patient ${video?.patientName} has been VERIFIED by the consultant.`,
                reviewedBy: req.user.id,
            });
        }

        // Send a chat message back to the doctor
        if (video?.uploadedBy) {
            await ChatMessage.create({
                senderId:   req.user.id,
                receiverId: video.uploadedBy,
                videoId:    videoId,
                message:    `✅ CASE VERIFIED\n\nPatient: ${video.patientName}\nCase ID: ${videoId}\n\n${consultantNotes || 'The AI findings have been reviewed and verified as clinically accurate.'}\n\nNo further action required from my end. Please proceed accordingly.`,
            });
        }

        await AuditLog.create({
            userId:   req.user.id,
            action:   'VERIFY',
            entity:   'Video',
            entityId: videoId,
            details:  `Case verified by consultant for video: ${videoId}`,
            status:   'success',
        });

        res.status(200).json({ message: 'Case verified successfully.', report });

    } catch (err) {
        console.error('Verify case error:', err.message);
        res.status(500).json({ message: 'Server error verifying case.' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/consultant/review/:videoId/reject
// Consultant rejects the case with a reason
// ─────────────────────────────────────────────────────────────────────────────
const rejectCase = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { rejectionReason } = req.body;

        if (!rejectionReason || !rejectionReason.trim()) {
            return res.status(400).json({ message: 'Rejection reason is required.' });
        }

        const analysis = await Analysis.findOne({ videoId });
        if (!analysis) {
            return res.status(404).json({ message: 'Analysis not found.' });
        }

        // Update or create report
        let report = await Report.findOne({ videoId });
        if (report) {
            report.reviewStatus         = 'rejected';
            report.rejectionReason      = rejectionReason;
            report.consultantReviewedBy = req.user.id;
            report.consultantReviewedAt = new Date();
            report.consultantNotes      = rejectionReason;
            await report.save();
        } else {
            report = await Report.create({
                videoId,
                analysisId:              analysis._id,
                generatedBy:             req.user.id,
                summary:                 analysis.reportSummary,
                consultantNotes:         rejectionReason,
                consultantReviewedBy:    req.user.id,
                consultantReviewedAt:    new Date(),
                reviewStatus:            'rejected',
                rejectionReason,
            });
        }

        // Notify doctor via Socket.IO
        const video        = await Video.findById(videoId);
        const io           = req.app.get('io');
        const onlineUsers  = req.app.get('onlineUsers');
        const doctorSocket = onlineUsers.get(String(video?.uploadedBy));

        if (doctorSocket && io) {
            io.to(doctorSocket).emit('case_reviewed', {
                videoId,
                status:  'rejected',
                message: `Your case for patient ${video?.patientName} was REJECTED. Reason: ${rejectionReason}`,
                reviewedBy: req.user.id,
            });
        }

        // Send a chat message back to the doctor
        if (video?.uploadedBy) {
            await ChatMessage.create({
                senderId:   req.user.id,
                receiverId: video.uploadedBy,
                videoId:    videoId,
                message:    `❌ CASE REJECTED\n\nPatient: ${video.patientName}\nCase ID: ${videoId}\n\nRejection Reason:\n${rejectionReason}\n\nPlease review the case and re-submit if necessary.`,
            });
        }

        await AuditLog.create({
            userId:   req.user.id,
            action:   'REJECT',
            entity:   'Video',
            entityId: videoId,
            details:  `Case rejected by consultant. Reason: ${rejectionReason}`,
            status:   'success',
        });

        res.status(200).json({ message: 'Case rejected successfully.', report });

    } catch (err) {
        console.error('Reject case error:', err.message);
        res.status(500).json({ message: 'Server error rejecting case.' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/consultant/stats
// Dashboard stats for consultant
// ─────────────────────────────────────────────────────────────────────────────
const getConsultantStats = async (req, res) => {
    try {
        const consultantId = req.user.id;

        // All referrals sent to this consultant
        const allReferrals = await ChatMessage.find({
            receiverId: consultantId,
            videoId:    { $ne: null },
        });

        const uniqueVideoIds = [...new Set(allReferrals.map(m => m.videoId.toString()))];

        // Count reviews by status
        const reports = await Report.find({
            videoId:             { $in: uniqueVideoIds },
            consultantReviewedBy: consultantId,
        });

        const verified = reports.filter(r => r.reviewStatus === 'verified').length;
        const rejected = reports.filter(r => r.reviewStatus === 'rejected').length;
        const pending  = uniqueVideoIds.length - verified - rejected;

        // Average confidence from verified analyses
        const verifiedVideoIds = reports
            .filter(r => r.reviewStatus === 'verified')
            .map(r => r.videoId);

        const verifiedAnalyses = await Analysis.find({
            videoId: { $in: verifiedVideoIds }
        });

        let totalConf = 0, confCount = 0;
        verifiedAnalyses.forEach(a => {
            (a.detections || []).forEach(d => {
                if (d.confidence) { totalConf += d.confidence; confCount++; }
            });
        });

        const avgConfidence = confCount > 0
            ? ((totalConf / confCount) * 100).toFixed(1)
            : 0;

        res.status(200).json({
            totalReferrals: uniqueVideoIds.length,
            pending:        Math.max(0, pending),
            verified,
            rejected,
            avgConfidence:  parseFloat(avgConfidence),
        });

    } catch (err) {
        console.error('Consultant stats error:', err.message);
        res.status(500).json({ message: 'Server error fetching stats.' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/consultant/list
// ─────────────────────────────────────────────────────────────────────────────
const getConsultantList = async (req, res) => {
    try {
        const consultants = await User.find({ role: 'Consultant' })
            .select('name email designation affiliation');
        res.status(200).json({ total: consultants.length, consultants });
    } catch (err) {
        console.error('Get consultant list error:', err.message);
        res.status(500).json({ message: 'Server error fetching consultants.' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/consultant/video/:videoId
// Streams the original video file to a verified consultant (referral required)
// ─────────────────────────────────────────────────────────────────────────────
const streamVideoForConsultant = async (req, res) => {
    try {
        if (req.user.role !== 'Consultant') {
            return res.status(403).json({ message: 'Access denied. Consultants only.' });
        }

        const { videoId } = req.params;

        const referral = await ChatMessage.findOne({
            receiverId: req.user.id,
            videoId,
        });

        if (!referral) {
            return res.status(403).json({ message: 'No referral found for this video.' });
        }

        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({ message: 'Video not found.' });
        }

        const filePath = video.filePath;
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Video file not found on disk.' });
        }

        const ext = path.extname(filePath).toLowerCase();

        if (ext === '.mp4') {
            const stat = fs.statSync(filePath);
            res.status(200).set({
                'Content-Length': stat.size,
                'Content-Type':   'video/mp4',
                'Accept-Ranges':  'bytes',
            });
            fs.createReadStream(filePath).pipe(res);
        } else {
            // AVI (or other) — transcode to fragmented MP4 via ffmpeg and pipe directly
            const ff = spawn('ffmpeg', [
                '-i', filePath,
                '-vcodec', 'libx264',
                '-acodec', 'aac',
                '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
                '-pix_fmt', 'yuv420p',
                '-f', 'mp4',
                'pipe:1',
            ]);

            res.status(200).set({ 'Content-Type': 'video/mp4' });
            ff.stdout.pipe(res);
            ff.stderr.on('data', (d) => console.log('[ffmpeg]', d.toString()));
            ff.on('error', (err) => {
                console.error('ffmpeg spawn error:', err.message);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Video conversion failed — ffmpeg not found.' });
                }
            });
            req.on('close', () => ff.kill('SIGTERM'));
        }

    } catch (err) {
        console.error('Stream video error:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Server error streaming video.' });
        }
    }
};

// Keep old submitReview for backward compat
const submitReview = verifyCase;

module.exports = {
    getReviewQueue,
    verifyCase,
    rejectCase,
    getConsultantStats,
    getConsultantList,
    submitReview,
    streamVideoForConsultant,
};