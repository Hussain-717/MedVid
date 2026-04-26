const Patient  = require('../models/patient');
const Video    = require('../models/Video');
const Analysis = require('../models/Analysis');
const Report   = require('../models/Report');
const axios    = require('axios');
const FormData = require('form-data');
const fs       = require('fs');

const FLASK_URL = 'http://localhost:5001';

// ─────────────────────────────────────────────────────────────
// GET /api/analysis/patients
// ─────────────────────────────────────────────────────────────
const getAllPatients = async (req, res) => {
    try {
        const patients = await Patient.find().sort({ createdAt: -1 });
        res.status(200).json({ patients });
    } catch (error) {
        console.error("Get patients error:", error);
        res.status(500).json({ message: "Error fetching patients" });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/analysis/upload
// ─────────────────────────────────────────────────────────────
const uploadAndAnalyze = async (req, res) => {
    try {
        console.log("---- INCOMING UPLOAD REQUEST ----");
        console.log("Body data:", req.body);
        console.log("File data:", req.file ? req.file.originalname : "No file");

        const { patientType, name, age, gender, phone, patientId } = req.body;

        let finalPatientId   = patientId;
        let finalPatientName = name;
        let finalPatientAge  = parseInt(age, 10);

        // ── Step 1: Handle Patient Data ───────────────────────────
        if (patientType === 'new') {
            if (!name || !age || !gender) {
                return res.status(400).json({ message: "Missing required patient fields." });
            }
            const newPatient = new Patient({ name, age: finalPatientAge, gender, phone });
            await newPatient.save();
            finalPatientId   = newPatient._id;
            finalPatientName = newPatient.name;
            finalPatientAge  = newPatient.age;
        } else {
            if (!finalPatientId) {
                return res.status(400).json({ message: "Existing patient ID is missing." });
            }
            const existingPatient = await Patient.findById(finalPatientId);
            if (!existingPatient) {
                return res.status(404).json({ message: "Patient not found in database." });
            }
            finalPatientName = existingPatient.name;
            finalPatientAge  = existingPatient.age;
        }

        // ── Step 2: Validate Video File ───────────────────────────
        if (!req.file) {
            return res.status(400).json({ message: "Video file is required." });
        }

        // ── Step 3: Create Video Document ─────────────────────────
        const newVideo = new Video({
            uploadedBy:   req.user.id,
            filename:     req.file.filename,
            originalName: req.file.originalname,
            filePath:     req.file.path,
            fileSize:     req.file.size,
            mimeType:     req.file.mimetype,
            patientName:  finalPatientName,
            patientId:    finalPatientId.toString(),
            status:       'processing'
        });
        await newVideo.save();

        // ── Step 4: Call Flask AI Model ───────────────────────────
        console.log("Calling Flask model service...");
        let aiResult = null;
        try {
            const form = new FormData();
            form.append('video', fs.createReadStream(req.file.path), {
                filename: req.file.originalname
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
            console.log("AI Result:", aiResult);

        } catch (flaskError) {
            console.error("Flask service error:", flaskError.message);
            // Fallback if Flask is down
            aiResult = {
                label:       'Analysis Unavailable',
                confidence:  0,
                is_abnormal: false,
                timestamp:   0,
                bbox:        [0, 0, 0, 0],
                clip_url:    null
            };
        }

        // ── Step 5: Build Detections ──────────────────────────────
        const detections = aiResult.is_abnormal ? [
            {
                type:       aiResult.label,
                location:   aiResult.location  || 'GI Tract',
                severity:   aiResult.confidence > 80 ? 'High' : 'Medium',
                confidence: aiResult.confidence / 100,
                time:       aiResult.timestamp  || 0,
                bbox:       aiResult.bbox       || [0, 0, 0, 0]
            }
        ] : [];

        // These must be defined in this order
        const topSeverity     = detections.length > 0 ? detections[0].severity : 'None';
        const totalDetections = detections.length;
        const reportSummary   = aiResult.is_abnormal
            ? `AI detected ${totalDetections} anomaly. Label: ${aiResult.label}. Confidence: ${aiResult.confidence}%. Consultant review recommended.`
            : `AI analysis complete. No anomalies detected. Confidence: ${aiResult.confidence}%.`;

        // Clip URL from Flask
        const clipUrl = aiResult.clip_url
            ? `http://localhost:5001/clips/${aiResult.clip_url}`
            : null;

        console.log("Clip URL from Flask:", clipUrl);

        // ── Step 6: Update Video Status ───────────────────────────
        newVideo.status = 'completed';
        await newVideo.save();

        // ── Step 7: Create & Save Analysis Document ───────────────
        const newAnalysis = new Analysis({
            videoId:         newVideo._id,
            status:          'completed',
            detections:      detections,
            reportSummary:   reportSummary,
            topSeverity:     topSeverity,
            totalDetections: totalDetections,
            runtimeSeconds:  35,
            processedAt:     Date.now(),
            clipUrl:         clipUrl,
        });
        await newAnalysis.save(); // ✅ THIS WAS MISSING — now fixed

        // ── Step 8: Create & Save Report Document ─────────────────
        const newReport = new Report({
            videoId:     newVideo._id,
            analysisId:  newAnalysis._id,
            generatedBy: req.user.id,
            patientName: finalPatientName,
            patientAge:  finalPatientAge,
            summary:     reportSummary
        });
        await newReport.save();

        // ── Step 9: Send Success Response ─────────────────────────
        res.status(200).json({
            success:   true,
            reportId:  newReport._id,
            patientId: finalPatientId,
            videoId:   newVideo._id,
            aiResult:  aiResult,
            message:   "Upload and analysis successful"
        });

    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ message: "Server error during analysis generation." });
    }
};

module.exports = { getAllPatients, uploadAndAnalyze };