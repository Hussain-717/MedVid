const PDFDocument = require('pdfkit');
const Report      = require('../models/Report');
const Video       = require('../models/Video');
const Analysis    = require('../models/Analysis');
const Patient     = require('../models/patient');
const AuditLog    = require('../models/AuditLog');

// ── Helper: format seconds → "0:38 (38s)" ─────────────────────────────────────
const fmtTime = (s) => {
    if (s === undefined || s === null) return 'N/A';
    const total = Math.floor(s);
    const m     = Math.floor(total / 60);
    const sec   = total % 60;
    return `${m}:${String(sec).padStart(2, '0')} (${total}s)`;
};

// GET /api/reports/:videoId
const getReport = async (req, res) => {
    try {
        const { videoId } = req.params;
        const report = await Report.findOne({ videoId })
            .populate('generatedBy',          'name email role')
            .populate('consultantReviewedBy', 'name email role');

        if (!report) return res.status(404).json({ message: 'Report not found.' });

        const video    = await Video.findById(videoId);
        const analysis = await Analysis.findOne({ videoId });

        res.status(200).json({
            report,
            video: {
                filename:    video.originalName,
                patientName: video.patientName,
                patientId:   video.patientId,
                uploadedAt:  video.uploadedAt,
            },
            analysis: {
                detections:      analysis.detections,
                topSeverity:     analysis.topSeverity,
                totalDetections: analysis.totalDetections,
                reportSummary:   analysis.reportSummary,
                processedAt:     analysis.processedAt,
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error fetching report.' });
    }
};

// POST /api/reports/:videoId/generate
const generateReport = async (req, res) => {
    try {
        const { videoId } = req.params;

        const video = await Video.findById(videoId);
        if (!video) return res.status(404).json({ message: 'Video not found.' });

        const analysis = await Analysis.findOne({ videoId });
        if (!analysis) return res.status(404).json({ message: 'Analysis not found.' });

        let report = await Report.findOne({ videoId });
        if (report) return res.status(200).json({ message: 'Report already exists.', report });

        report = await Report.create({
            videoId,
            analysisId:  analysis._id,
            generatedBy: req.user.id,
            summary:     analysis.reportSummary,
        });

        await AuditLog.create({
            userId:   req.user.id,
            action:   'GENERATE_REPORT',
            entity:   'Report',
            entityId: report._id.toString(),
            details:  `Report generated for video: ${video.originalName}`,
            status:   'success',
        });

        res.status(201).json({ message: 'Report generated successfully.', report });
    } catch (err) {
        res.status(500).json({ message: 'Server error generating report.' });
    }
};

// GET /api/reports/:videoId/export
const exportReport = async (req, res) => {
    try {
        const { videoId } = req.params;

        const report = await Report.findOne({ videoId })
            .populate('generatedBy',          'name email role')
            .populate('consultantReviewedBy', 'name email role');

        if (!report) return res.status(404).json({ message: 'Report not found.' });

        const video    = await Video.findById(videoId);
        const analysis = await Analysis.findOne({ videoId });

        await AuditLog.create({
            userId:   req.user.id,
            action:   'EXPORT_REPORT',
            entity:   'Report',
            entityId: report._id.toString(),
            details:  `Report exported for video: ${video.originalName}`,
            status:   'success',
        });

        res.status(200).json({
            message:    'Report exported successfully.',
            exportedAt: new Date(),
            report,
            video: {
                filename:    video.originalName,
                patientName: video.patientName,
                patientId:   video.patientId,
                uploadedAt:  video.uploadedAt,
            },
            analysis: {
                detections:      analysis.detections,
                topSeverity:     analysis.topSeverity,
                totalDetections: analysis.totalDetections,
                reportSummary:   analysis.reportSummary,
                processedAt:     analysis.processedAt,
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error exporting report.' });
    }
};

// GET /api/reports/:videoId/download  → generates real PDF
const downloadReport = async (req, res) => {
    try {
        const { videoId } = req.params;

        const video    = await Video.findById(videoId);
        const analysis = await Analysis.findOne({ videoId });
        if (!video || !analysis) {
            return res.status(404).json({ message: 'Report data not found.' });
        }

        if (video.uploadedBy.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Not authorised to download this report.' });
        }

        // 2. Get patient age & gender
        let patientAge    = 'N/A';
        let patientGender = 'N/A';
        if (video.patientId) {
            const patient = await Patient.findById(video.patientId);
            if (patient) {
                patientAge    = patient.age    ?? 'N/A';
                patientGender = patient.gender ?? 'N/A';
            }
        }

        // 3. Create PDF
        const doc  = new PDFDocument({ margin: 50 });
        const BLUE = '#00BFFF';

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=MedVid-Report-${videoId}.pdf`
        );
        doc.pipe(res);

        const drawDivider = () => {
            doc.moveTo(50, doc.y).lineTo(560, doc.y)
               .strokeColor(BLUE).lineWidth(1).stroke();
            doc.moveDown(0.8);
        };

        // ── Header ────────────────────────────────────────────────────────────
        doc.fontSize(22).font('Helvetica-Bold').fillColor(BLUE)
           .text('MedVid AI — Analysis Report', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica').fillColor('gray')
           .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(0.8);
        drawDivider();

        // ── Patient Info ──────────────────────────────────────────────────────
        doc.fontSize(13).font('Helvetica-Bold').fillColor(BLUE)
           .text('Patient Information');
        doc.moveDown(0.4);

        const infoRows = [
            ['Patient Name', video.patientName || 'N/A'],
            ['Age',          String(patientAge)],
            ['Gender',       String(patientGender)],
            ['Case ID',      video._id.toString()],
            ['Video File',   video.originalName || 'N/A'],
            ['Uploaded At',  new Date(video.uploadedAt).toLocaleString()],
            ['Processed At', analysis.processedAt
                ? new Date(analysis.processedAt).toLocaleString() : 'N/A'],
            ['Status',       (analysis.status || 'N/A').toUpperCase()],
        ];

        doc.fontSize(10).fillColor('black');
        infoRows.forEach(([label, value]) => {
            doc.font('Helvetica-Bold').text(`${label}: `, { continued: true })
               .font('Helvetica').text(value);
        });

        doc.moveDown(0.8);
        drawDivider();

        // ── Diagnostic Summary ────────────────────────────────────────────────
        doc.fontSize(13).font('Helvetica-Bold').fillColor(BLUE)
           .text('Diagnostic Summary');
        doc.moveDown(0.4);
        doc.fontSize(10).fillColor('black');
        doc.font('Helvetica-Bold').text('Total Detections: ', { continued: true })
           .font('Helvetica').text(String(analysis.totalDetections || 0));
        doc.font('Helvetica-Bold').text('Top Severity: ', { continued: true })
           .font('Helvetica').text(analysis.topSeverity || 'None');
        doc.font('Helvetica-Bold').text('Runtime: ', { continued: true })
           .font('Helvetica').text(`${analysis.runtimeSeconds || 0} seconds`);
        doc.moveDown(0.4);
        doc.font('Helvetica-Bold').text('AI Summary:');
        doc.font('Helvetica').fillColor('#333')
           .text(analysis.reportSummary || 'No summary available.', { indent: 10 });

        doc.moveDown(0.8);
        drawDivider();

        // ── Detections Table ──────────────────────────────────────────────────
        doc.fontSize(13).font('Helvetica-Bold').fillColor(BLUE)
           .text('Detailed AI Detections');
        doc.moveDown(0.5);

        const detections = analysis.detections || [];

        if (detections.length === 0) {
            doc.fontSize(10).font('Helvetica').fillColor('black')
               .text('No significant detections found.');
        } else {
            // Column positions & widths
            const colX      = [50,  100, 210, 295, 365, 445];
            const colWidths = [40,  100,  75,  60,  70,  90];
            const headers   = ['#', 'Type', 'Location', 'Severity', 'Confidence', 'Timestamp'];

            // Header row (blue background)
            const headerY = doc.y;
            doc.rect(50, headerY, 510, 18).fill(BLUE);
            headers.forEach((h, i) => {
                doc.fontSize(9).font('Helvetica-Bold').fillColor('white')
                   .text(h, colX[i], headerY + 4, { width: colWidths[i] });
            });
            doc.y = headerY + 22;

            // Data rows
            detections.forEach((d, idx) => {
                const rowY = doc.y;
                const bg   = idx % 2 === 0 ? '#EBF8FF' : '#FFFFFF';
                doc.rect(50, rowY, 510, 18).fill(bg);

                const cells = [
                    String(idx + 1),
                    d.type       || 'N/A',
                    d.location   || 'N/A',
                    d.severity   || 'N/A',
                    `${((d.confidence || 0) * 100).toFixed(1)}%`,
                    fmtTime(d.time),
                ];

                cells.forEach((val, i) => {
                    doc.fontSize(9).font('Helvetica').fillColor('black')
                       .text(val, colX[i], rowY + 4, { width: colWidths[i] });
                });
                doc.y = rowY + 22;
            });

            // ── Detection Timeline Summary (plain English) ────────────────────
            doc.moveDown(1.2);
            doc.fontSize(12).font('Helvetica-Bold').fillColor(BLUE)
               .text('Detection Timeline Summary:');
            doc.moveDown(0.4);

            detections.forEach((d) => {
                doc.fontSize(10).font('Helvetica').fillColor('black')
                   .text(
                       `• At ${fmtTime(d.time)} — ${d.type || 'Finding'} detected in ` +
                       `${d.location || 'GI Tract'} with ${d.severity || 'N/A'} severity ` +
                       `(Confidence: ${((d.confidence || 0) * 100).toFixed(1)}%)`,
                       { indent: 10 }
                   );
            });
        }

        doc.moveDown(2);

        // ── Footer ────────────────────────────────────────────────────────────
        doc.moveTo(50, doc.y).lineTo(560, doc.y)
           .strokeColor('gray').lineWidth(0.5).stroke();
        doc.moveDown(0.5);
        doc.fontSize(8).font('Helvetica').fillColor('gray')
           .text(
               'This report is generated by MedVid AI for clinical reference only. ' +
               'It does not replace professional medical diagnosis.',
               { align: 'center' }
           );

        doc.end();

    } catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ message: 'Failed to generate PDF report.' });
        }
    }
};

module.exports = { getReport, generateReport, exportReport, downloadReport };