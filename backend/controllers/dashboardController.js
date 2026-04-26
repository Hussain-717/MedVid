const Video       = require('../models/Video');
const Analysis    = require('../models/Analysis');
const ChatMessage = require('../models/ChatMessage');

// GET /api/dashboard
const getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;

        // ── 1. Key Metrics ─────────────────────────────────────────
        const [
            myVideoIds,
            totalVideos,
            pendingVideos,
            completedVideos,
            uniquePatientNames,
            unreadMessages,
        ] = await Promise.all([
            Video.distinct('_id',         { uploadedBy: userId }),
            Video.countDocuments(         { uploadedBy: userId }),
            Video.countDocuments(         { uploadedBy: userId, status: 'processing' }),
            Video.countDocuments(         { uploadedBy: userId, status: 'completed' }),
            Video.distinct('patientName', { uploadedBy: userId }),
            ChatMessage.countDocuments(   { receiverId: userId, isRead: false }),
        ]);

        const totalPatients = uniquePatientNames.length;

        // ── 2. Severity Breakdown ──────────────────────────────────
        const myAnalyses = await Analysis.find({ videoId: { $in: myVideoIds } });

        let highCount   = 0;
        let mediumCount = 0;
        let lowCount    = 0;
        let totalDetections = 0;
        let totalConfidence = 0;
        let confidenceCount = 0;

        myAnalyses.forEach(a => {
            if (a.topSeverity === 'High')   highCount++;
            else if (a.topSeverity === 'Medium') mediumCount++;
            else if (a.topSeverity === 'Low')    lowCount++;

            (a.detections || []).forEach(d => {
                totalDetections++;
                if (d.confidence) {
                    totalConfidence += d.confidence;
                    confidenceCount++;
                }
            });
        });

        const avgConfidence = confidenceCount > 0
            ? ((totalConfidence / confidenceCount) * 100).toFixed(1)
            : 0;

        // ── 3. Last 7 Days Trend ───────────────────────────────────
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

        const recentVideos = await Video.find({
            uploadedBy: userId,
            uploadedAt: { $gte: sevenDaysAgo }
        }).sort({ uploadedAt: 1 });

        // Build day-by-day map
        const dayMap = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            dayMap[key] = { high: 0, medium: 0, low: 0, total: 0 };
        }

        // Get analyses for recent videos
        const recentVideoIds = recentVideos.map(v => v._id);
        const recentAnalyses = await Analysis.find({
            videoId: { $in: recentVideoIds }
        });

        const analysisMap = {};
        recentAnalyses.forEach(a => {
            analysisMap[a.videoId.toString()] = a;
        });

        recentVideos.forEach(video => {
            const dateKey = new Date(video.uploadedAt).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric'
            });
            if (dayMap[dateKey]) {
                const analysis = analysisMap[video._id.toString()];
                dayMap[dateKey].total++;
                if (analysis?.topSeverity === 'High')   dayMap[dateKey].high++;
                if (analysis?.topSeverity === 'Medium') dayMap[dateKey].medium++;
                if (analysis?.topSeverity === 'Low')    dayMap[dateKey].low++;
            }
        });

        const trendLabels = Object.keys(dayMap);
        const trendData = {
            labels: trendLabels,
            high:   trendLabels.map(k => dayMap[k].high),
            medium: trendLabels.map(k => dayMap[k].medium),
            low:    trendLabels.map(k => dayMap[k].low),
            total:  trendLabels.map(k => dayMap[k].total),
        };

        // ── 4. Recent Activity ─────────────────────────────────────
        const recentActivity = await Video.find({ uploadedBy: userId })
            .sort({ uploadedAt: -1 })
            .limit(5)
            .lean();

        const activityVideoIds = recentActivity.map(v => v._id);
        const activityAnalyses = await Analysis.find({
            videoId: { $in: activityVideoIds }
        }).lean();

        const activityAnalysisMap = {};
        activityAnalyses.forEach(a => {
            activityAnalysisMap[a.videoId.toString()] = a;
        });

        const recentReports = recentActivity.map(video => {
            const analysis = activityAnalysisMap[video._id.toString()];
            return {
                videoId:     video._id,
                patientName: video.patientName || 'Unknown',
                uploadedAt:  video.uploadedAt,
                severity:    analysis?.topSeverity || 'None',
                status:      video.status,
                detections:  analysis?.totalDetections || 0,
            };
        });

        // ── 5. Send Response ───────────────────────────────────────
        res.status(200).json({
            metrics: {
                totalVideos,
                pendingVideos,
                completedVideos,
                totalPatients,
                totalDetections,
                highCount,
                mediumCount,
                lowCount,
                avgConfidence: parseFloat(avgConfidence),
                unreadMessages,
            },
            trend:          trendData,
            recentReports,
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error fetching dashboard data.' });
    }
};

module.exports = { getDashboardData };