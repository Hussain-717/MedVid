import React, { useState, useEffect } from "react";
import {
    Box, Typography, useTheme, Container, Paper, CircularProgress,
    Alert, Button, Grid, Chip, IconButton, Divider,
    Table, TableBody, TableCell, TableHead, TableRow,
    Dialog, DialogTitle, DialogContent, DialogActions,
    List, ListItem, ListItemAvatar, ListItemText,
    Avatar, RadioGroup, FormControlLabel, Radio,
    Snackbar, Tooltip
} from '@mui/material';
import {
    Report as ReportIcon, ArrowBack, Download, Refresh,
    AccessTime, Videocam, Visibility, Healing, Speed,
    ChatBubbleOutline, PersonSearch, Wc, Cake, Badge,
    VideoFile, CalendarMonth, CheckCircle, HourglassTop, VideoLibrary
} from '@mui/icons-material';
import { useNavigate, Link, useParams } from "react-router-dom";
import { getResults, reRunAnalysis, exportReport, downloadVideo } from "../services/api";
import api from "../services/api";

// â”€â”€ Timestamp Formatter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const formatTimestamp = (seconds) => {
    if (seconds === undefined || seconds === null) return 'N/A';
    const totalSecs = Math.floor(seconds);
    const mins      = Math.floor(totalSecs / 60);
    const secs      = totalSecs % 60;
    return `${mins}:${String(secs).padStart(2, '0')} (${totalSecs}s)`;
};

// â”€â”€ Severity Chip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SeverityChip = ({ severity }) => {
    const map = {
        high:   { color: 'error',   label: 'High'   },
        medium: { color: 'warning', label: 'Medium' },
        low:    { color: 'success', label: 'Low'    },
    };
    const key   = severity?.toLowerCase();
    const found = map[key] || { color: 'default', label: severity || 'N/A' };
    return <Chip label={found.label} color={found.color} size="small" sx={{ fontWeight: 'bold' }} />;
};

// â”€â”€ Info Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const InfoCard = ({ label, value, accentColor, mono }) => (
    <Box>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
            {label}
        </Typography>
        <Typography variant="body1" sx={{
            color: accentColor, fontWeight: 'bold', wordBreak: 'break-all', mt: 0.3,
            fontFamily: mono ? 'monospace' : 'inherit',
            fontSize: mono ? '0.8rem' : '1rem',
        }}>
            {value || 'N/A'}
        </Typography>
    </Box>
);

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Results() {
    const { videoId }  = useParams();
    const navigate     = useNavigate();
    const theme        = useTheme();
    const accentColor  = theme.palette.infoHighlight || theme.palette.primary.main;

    const [result,        setResult]       = useState(null);
    const [loading,       setLoading]      = useState(false);
    const [error,         setError]        = useState(null);
    const [reRunning,     setReRunning]    = useState(false);
    const [exporting,     setExporting]    = useState(false);

    // Snackbar toast
    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
    const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });
    const closeToast = () => setToast(t => ({ ...t, open: false }));

    // â”€â”€ Consult Modal State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [consultModal,    setConsultModal]    = useState(false);
    const [consultants,     setConsultants]     = useState([]);
    const [selectedConsult, setSelectedConsult] = useState('');
    const [consultLoading,  setConsultLoading]  = useState(false);
    const [consultSending,  setConsultSending]  = useState(false);

    // â”€â”€ Fetch Results â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const fetchResult = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getResults(videoId);
            setResult(res.data);
        } catch (err) {
            setError(err.message || "Failed to fetch results.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (videoId) fetchResult();
    }, [videoId]);

    // â”€â”€ Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleReRun = async () => {
        setReRunning(true);
        try {
            await reRunAnalysis(videoId);
            showToast('Analysis re-queued. Redirecting to historyâ€¦');
            setTimeout(() => navigate('/history'), 1500);
        } catch {
            showToast('Failed to re-run analysis.', 'error');
        } finally {
            setReRunning(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            await exportReport(videoId);
            showToast('Report downloaded successfully.');
        } catch {
            showToast('Failed to download report. Please try again.', 'error');
        } finally {
            setExporting(false);
        }
    };

    // â”€â”€ Open Consult Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleOpenConsult = async () => {
        setConsultModal(true);
        setConsultLoading(true);
        try {
            const response = await api.get('/chat/consultants');
            const list     = response.data.consultants || [];
            setConsultants(list);
            if (list.length > 0) setSelectedConsult(list[0].id);
        } catch {
            showToast('Failed to load consultants.', 'error');
        } finally {
            setConsultLoading(false);
        }
    };

    // â”€â”€ Initiate Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleInitiateChat = async () => {
        if (!selectedConsult || !result) return;
        setConsultSending(true);

        try {
            const clipUrl = result.clipUrl || null;

            const openingMessage =
                `CASE REFERRAL REQUEST\n\n` +
                `Patient: ${result.patientName}\n` +
                `Age: ${result.patientAge} | Gender: ${result.patientGender}\n\n` +
                `AI Finding: ${result.detections?.[0]?.type || 'N/A'}\n` +
                `Severity: ${result.topSeverity}\n` +
                `Confidence: ${((result.detections?.[0]?.confidence || 0) * 100).toFixed(1)}%\n\n` +
                `Summary: ${result.reportSummary}\n\n` +
                `Case ID: ${result.videoId}`;

            await api.post('/chat/start', {
                consultantId: selectedConsult,
                videoId:      result.videoId,
                clipUrl,
                message:      openingMessage,
            });

            localStorage.setItem('lastAnalyzedVideoId', result.videoId);
            setConsultModal(false);
            navigate('/consultant');

        } catch {
            showToast('Failed to start chat. Please try again.', 'error');
        } finally {
            setConsultSending(false);
        }
    };

    // â”€â”€ Loading / Error States â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 10 }}>
            <CircularProgress sx={{ color: accentColor }} />
            <Typography sx={{ ml: 2, color: 'text.secondary' }}>Loading analysis report...</Typography>
        </Box>
    );

    if (error) return (
        <Alert severity="error" sx={{ m: 3 }}>
            {error}
            <Button onClick={() => navigate('/history')} sx={{ ml: 2 }}>Go to History</Button>
        </Alert>
    );

    if (!result) return (
        <Alert severity="warning" sx={{ m: 3 }}>No report data found for this ID.</Alert>
    );

    const totalDetections = result.detections?.length || 0;

    return (
        <Container maxWidth="xl" sx={{ p: 3 }}>

            {/* â”€â”€ Title â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <Typography variant="h4" fontWeight="bold" mb={3} sx={{ color: theme.palette.text.primary }}>
                <ReportIcon sx={{ mr: 1, fontSize: 36, verticalAlign: 'middle', color: accentColor }} />
                Analysis Report
            </Typography>

            {/* â”€â”€ 1. Patient & Case Info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <Paper elevation={6} sx={{ mb: 4, borderRadius: 3, overflow: 'hidden', border: `1px solid ${accentColor}25` }}>
                <Grid container>

                    {/* Left panel â€” identity */}
                    <Grid item xs={12} md={3} sx={{
                        background: `linear-gradient(160deg, ${accentColor}22 0%, ${accentColor}08 100%)`,
                        borderRight: { md: `1px solid ${accentColor}20` },
                        borderBottom: { xs: `1px solid ${accentColor}20`, md: 'none' },
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        p: 4, gap: 1.5,
                    }}>
                        <Avatar sx={{
                            width: 80, height: 80,
                            bgcolor: accentColor,
                            color: theme.palette.background.default,
                            fontSize: '2.2rem', fontWeight: 900,
                            boxShadow: `0 4px 24px ${accentColor}55`,
                            mb: 0.5,
                        }}>
                            {result.patientName?.[0]?.toUpperCase() || '?'}
                        </Avatar>

                        <Typography variant="h6" fontWeight="bold" textAlign="center" sx={{ color: theme.palette.text.primary, lineHeight: 1.2 }}>
                            {result.patientName || 'Unknown Patient'}
                        </Typography>

                        <Chip
                            icon={result.analysisStatus === 'COMPLETED' ? <CheckCircle sx={{ fontSize: 14 }} /> : <HourglassTop sx={{ fontSize: 14 }} />}
                            label={result.analysisStatus}
                            size="small"
                            color={result.analysisStatus === 'COMPLETED' ? 'success' : 'warning'}
                            sx={{ fontWeight: 'bold', mt: 0.5 }}
                        />
                    </Grid>

                    {/* Right panel â€” case details */}
                    <Grid item xs={12} md={9}>
                        <Box sx={{ p: 3 }}>
                            <Typography variant="overline" sx={{ color: accentColor, letterSpacing: 2, fontWeight: 'bold', display: 'block', mb: 2 }}>
                                Case Details
                            </Typography>
                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
                                gap: 0,
                            }}>
                                {[
                                    { icon: <Cake sx={{ fontSize: 18 }} />,         label: 'Age',       value: result.patientAge !== 'N/A' ? `${result.patientAge} years` : 'N/A' },
                                    { icon: <Wc sx={{ fontSize: 18 }} />,            label: 'Gender',    value: result.patientGender },
                                    { icon: <VideoFile sx={{ fontSize: 18 }} />,     label: 'Video File', value: result.filename },
                                    { icon: <Badge sx={{ fontSize: 18 }} />,         label: 'Case ID',   value: String(result.videoId), mono: true },
                                    { icon: <CalendarMonth sx={{ fontSize: 18 }} />, label: 'Uploaded',  value: result.uploadedAt  ? new Date(result.uploadedAt).toLocaleDateString()  : 'N/A' },
                                    { icon: <AccessTime sx={{ fontSize: 18 }} />,    label: 'Processed', value: result.processedAt ? new Date(result.processedAt).toLocaleDateString() : 'N/A' },
                                ].map(({ icon, label, value, mono }, i) => (
                                    <Box key={i} sx={{
                                        p: 2,
                                        borderRight:  { xs: i % 2 !== 1 ? `1px solid ${accentColor}15` : 'none', sm: i % 3 !== 2 ? `1px solid ${accentColor}15` : 'none' },
                                        borderBottom: { xs: i < 4    ? `1px solid ${accentColor}15` : 'none',    sm: i < 3    ? `1px solid ${accentColor}15` : 'none'    },
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, mb: 0.5, color: accentColor }}>
                                            {icon}
                                            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, color: theme.palette.text.secondary, fontSize: '0.65rem' }}>
                                                {label}
                                            </Typography>
                                        </Box>
                                        <Typography sx={{
                                            fontWeight: 'bold',
                                            color: theme.palette.text.primary,
                                            fontSize: mono ? '0.75rem' : '0.95rem',
                                            fontFamily: mono ? 'monospace' : 'inherit',
                                            wordBreak: 'break-all',
                                        }}>
                                            {value || 'N/A'}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Grid>

                </Grid>
            </Paper>

            {/* â”€â”€ 2. Summary + Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <Grid container spacing={4} mb={4}>

                <Grid item xs={12} md={8}>
                    <Paper elevation={4} sx={{ p: 3, height: '100%', borderRadius: 2 }}>
                        <Typography variant="h5" fontWeight="bold" mb={2}>
                            Diagnostic Summary
                        </Typography>
                        <Grid container spacing={2} mb={2}>
                            <Grid item>
                                <Chip icon={<Visibility />} label={`Detections: ${totalDetections}`} color="primary" />
                            </Grid>
                            <Grid item>
                                <SeverityChip severity={result.topSeverity} />
                            </Grid>
                            <Grid item>
                                <Chip
                                    icon={<Speed />}
                                    label={`Runtime: ${result.metadata?.runtime_seconds || 'N/A'}s`}
                                    color="info"
                                />
                            </Grid>
                        </Grid>
                        <Typography variant="body1" color="text.secondary">
                            {result.reportSummary || 'No summary available.'}
                        </Typography>
                    </Paper>
                </Grid>

                {/* â”€â”€ Actions Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <Grid item xs={12} md={4}>
                    <Paper elevation={4} sx={{
                        p: 3, height: '100%',
                        display: 'flex', flexDirection: 'column',
                        gap: 2, borderRadius: 2
                    }}>
                        <Button
                            variant="contained"
                            startIcon={<Download />}
                            onClick={handleExport}
                            disabled={result.analysisStatus !== 'COMPLETED' || exporting}
                            sx={{ bgcolor: accentColor }}
                        >
                            {exporting ? 'Preparing...' : 'Download Report (PDF)'}
                        </Button>

                        {/* âœ… Consult Specialist Button */}
                        <Button
                            variant="contained"
                            startIcon={<ChatBubbleOutline />}
                            onClick={handleOpenConsult}
                            color="secondary"
                        >
                            Consult a Specialist
                        </Button>

                        <Button
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={handleReRun}
                            disabled={reRunning}
                            color="secondary"
                        >
                            {reRunning ? 'Re-running...' : 'Re-run Analysis'}
                        </Button>
                        <Button
                            variant="text"
                            startIcon={<ArrowBack />}
                            component={Link}
                            to="/history"
                            sx={{ color: 'text.secondary' }}
                        >
                            Back to History
                        </Button>
                    </Paper>
                </Grid>
            </Grid>

            {/* â”€â”€ 3. Video Review â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <Typography variant="h5" fontWeight="bold" mb={2}>
                Video Review
            </Typography>
            <Paper elevation={4} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
                {result.clipUrl ? (
                    <Box>
                        <Alert severity="warning" sx={{ mb: 2, borderRadius: 1 }}>
                            Showing <strong>{formatTimestamp(result.detections[0]?.time)}</strong> detection
                            window, red heatmap highlights the suspicious region detected by AI.
                        </Alert>
                        <video
                            key={result.clipUrl}
                            controls
                            autoPlay
                            width="100%"
                            style={{
                                borderRadius:    '12px',
                                maxHeight:       '500px',
                                backgroundColor: '#000',
                                border:          `2px solid ${accentColor}`
                            }}
                        >
                            <source src={result.clipUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: 'error.main' }} />
                            <Typography variant="caption" color="text.secondary">
                                Red overlay = AI-detected suspicious region (heatmap)
                            </Typography>
                        </Box>
                    </Box>
                ) : (
                    <Box sx={{
                        width: '100%', height: 300,
                        bgcolor: theme.palette.background.default,
                        borderRadius: 1, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column',
                        border: `2px dashed ${accentColor}50`
                    }}>
                        <Videocam sx={{ fontSize: 60, color: accentColor }} />
                        <Typography color="text.secondary" mt={1}>
                            {result.totalDetections > 0
                                ? 'Heatmap clip not available for this case'
                                : 'No detections - no clip generated'}
                        </Typography>
                    </Box>
                )}
            </Paper>

            {/* â”€â”€ 4. Detections Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <Typography variant="h5" fontWeight="bold" mb={2}>
                Detailed AI Detections ({totalDetections})
            </Typography>

            {totalDetections > 0 ? (
                <>
                    <Table component={Paper} elevation={4} sx={{ borderRadius: 2, overflow: 'hidden', mb: 3 }}>
                        <TableHead sx={{ bgcolor: theme.palette.background.default }}>
                            <TableRow>
                                <TableCell sx={{ color: accentColor, fontWeight: 'bold' }}>#</TableCell>
                                <TableCell sx={{ color: accentColor, fontWeight: 'bold' }}>Finding Type</TableCell>
                                <TableCell sx={{ color: accentColor, fontWeight: 'bold' }}>Location</TableCell>
                                <TableCell sx={{ color: accentColor, fontWeight: 'bold' }} align="center">
                                    Timestamp (min:sec)
                                </TableCell>
                                <TableCell sx={{ color: accentColor, fontWeight: 'bold' }} align="center">Severity</TableCell>
                                <TableCell sx={{ color: accentColor, fontWeight: 'bold' }} align="center">Confidence</TableCell>
                                <TableCell sx={{ color: accentColor, fontWeight: 'bold' }} align="center">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {result.detections.map((detection, index) => (
                                <TableRow
                                    key={detection._id || index}
                                    hover
                                    sx={{ '&:last-child td': { border: 0 } }}
                                >
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Healing sx={{ color: accentColor, fontSize: 18 }} />
                                            {detection.type || 'N/A'}
                                        </Box>
                                    </TableCell>
                                    <TableCell>{detection.location || 'N/A'}</TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            icon={<AccessTime />}
                                            label={formatTimestamp(detection.time)}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <SeverityChip severity={detection.severity} />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Typography fontWeight="bold" color={
                                            detection.confidence >= 0.9 ? 'error.main' :
                                            detection.confidence >= 0.7 ? 'warning.main' : 'success.main'
                                        }>
                                            {((detection.confidence || 0) * 100).toFixed(1)}%
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center"><Tooltip title="Download Video"><IconButton size="small" sx={{ color: accentColor }} onClick={() => downloadVideo(videoId, result.filename)}><VideoLibrary fontSize="small" /></IconButton></Tooltip></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* Timeline Summary */}
                    <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2, border: `1px solid ${accentColor}30` }}>
                        <Typography variant="h6" fontWeight="bold" mb={1.5} sx={{ color: accentColor }}>
                            <AccessTime sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                            Detection Timeline Summary
                        </Typography>
                        {result.detections.map((d, index) => (
                            <Box
                                key={index}
                                sx={{
                                    display: 'flex', alignItems: 'flex-start',
                                    gap: 2, mb: 1.5, p: 1.5,
                                    borderRadius: 1,
                                    bgcolor: theme.palette.background.default
                                }}
                            >
                                <Chip
                                    icon={<AccessTime />}
                                    label={formatTimestamp(d.time)}
                                    size="small"
                                    color="primary"
                                    sx={{ minWidth: 110, fontWeight: 'bold' }}
                                />
                                <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                                    <strong>{d.type || 'Finding'}</strong> in{' '}
                                    <strong>{d.location || 'GI Tract'}</strong> with{' '}
                                    <strong>{d.severity || 'N/A'}</strong> severity
                                    {' '}Confidence:{' '}
                                    <strong style={{ color: accentColor }}>
                                        {((d.confidence || 0) * 100).toFixed(1)}%
                                    </strong>
                                </Typography>
                            </Box>
                        ))}
                    </Paper>
                </>
            ) : (
                <Alert severity="info" sx={{ borderRadius: 2, mb: 4 }}>
                    <Typography fontWeight="bold">No significant AI detections found.</Typography>
                    <Typography variant="body2">The video appears clear based on the AI model.</Typography>
                </Alert>
            )}

            <Divider sx={{ my: 2 }} />

            {/* â”€â”€ Consult Specialist Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <Dialog
                open={consultModal}
                onClose={() => !consultSending && setConsultModal(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonSearch sx={{ color: accentColor }} />
                    Select a Specialist to Consult
                </DialogTitle>

                <DialogContent dividers>
                    {/* Case Summary Box */}
                    <Paper sx={{
                        p: 2, mb: 2, borderRadius: 2,
                        bgcolor: accentColor + '10',
                        border: `1px solid ${accentColor}30`
                    }}>
                        <Typography variant="subtitle2" fontWeight="bold" color={accentColor} mb={0.5}>
                            Case Being Shared
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            <strong>Patient:</strong> {result?.patientName} | Age: {result?.patientAge} | {result?.patientGender}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            <strong>Finding:</strong> {result?.topSeverity} severity â€” {result?.detections?.[0]?.type || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            <strong>Confidence:</strong> {((result?.detections?.[0]?.confidence || 0) * 100).toFixed(1)}%
                        </Typography>
                    </Paper>

                    {/* Consultant List */}
                    <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                        Available Specialists:
                    </Typography>

                    {consultLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress sx={{ color: accentColor }} />
                        </Box>
                    ) : consultants.length === 0 ? (
                        <Alert severity="warning">
                            No consultants available. Ask admin to add consultants.
                        </Alert>
                    ) : (
                        <RadioGroup
                            value={selectedConsult}
                            onChange={(e) => setSelectedConsult(e.target.value)}
                        >
                            <List disablePadding>
                                {consultants.map((c) => (
                                    <ListItem
                                        key={c.id}
                                        onClick={() => setSelectedConsult(c.id)}
                                        sx={{
                                            border: `1px solid ${selectedConsult === c.id
                                                ? accentColor
                                                : theme.palette.divider}`,
                                            borderRadius: 2,
                                            mb: 1,
                                            cursor: 'pointer',
                                            bgcolor: selectedConsult === c.id
                                                ? accentColor + '10'
                                                : 'transparent',
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                bgcolor: accentColor + '08',
                                                borderColor: accentColor + '80'
                                            }
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: accentColor }}>
                                                {c.name?.[0]?.toUpperCase()}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Typography fontWeight="bold">
                                                    {c.name}
                                                </Typography>
                                            }
                                            secondary={c.specialty || 'Consultant'}
                                        />
                                        <FormControlLabel
                                            value={c.id}
                                            control={
                                                <Radio sx={{ color: accentColor, '&.Mui-checked': { color: accentColor } }} />
                                            }
                                            label=""
                                            sx={{ mr: 0 }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </RadioGroup>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button
                        onClick={() => setConsultModal(false)}
                        variant="outlined"
                        color="inherit"
                        disabled={consultSending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleInitiateChat}
                        variant="contained"
                        disabled={!selectedConsult || consultSending || consultants.length === 0}
                        startIcon={<ChatBubbleOutline />}
                        sx={{ bgcolor: accentColor, '&:hover': { bgcolor: accentColor } }}
                    >
                        {consultSending ? 'Starting Chat...' : 'Start Consultation'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <Snackbar open={toast.open} autoHideDuration={4000} onClose={closeToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={closeToast} severity={toast.severity} sx={{ width: '100%' }}>
                    {toast.message}
                </Alert>
            </Snackbar>

        </Container>
    );
}
