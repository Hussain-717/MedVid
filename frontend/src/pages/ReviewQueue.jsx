import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Container, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Chip, Button, IconButton,
    TextField, useTheme, Avatar, alpha,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Divider, Snackbar, Alert, CircularProgress, LinearProgress,
    Tooltip
} from '@mui/material';
import {
    Search, Visibility, LocalHospital, Close, Assignment,
    VideoCameraBack, Refresh, ThumbUp, ThumbDown,
    Person, AccessTime, CheckCircle, Warning
} from '@mui/icons-material';
import api from '../services/api';
import { useSocket, useSocketReady } from '../App';

export default function ReviewQueue() {
    const theme       = useTheme();
    const ORANGE      = '#FF7F50';
    const socketRef   = useSocket();
    const socketReady = useSocketReady();

    const [queue,        setQueue]        = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [searchTerm,   setSearchTerm]   = useState('');
    const [open,         setOpen]         = useState(false);
    const [selectedCase, setSelectedCase] = useState(null);
    const [isRejecting,  setIsRejecting]  = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [submitting,      setSubmitting]      = useState(false);
    const [snackbar,        setSnackbar]        = useState({ open: false, message: '', severity: 'success' });
    const [originalVideoUrl, setOriginalVideoUrl] = useState(null);
    const [loadingOriginal,  setLoadingOriginal]  = useState(false);

    const fetchQueue = useCallback(async () => {
        setLoading(true);
        try {
            const r = await api.get('/consultant/queue');
            setQueue(r.data.queue || []);
        } catch {
            setSnackbar({ open: true, message: 'Failed to load review queue.', severity: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchQueue(); }, [fetchQueue]);

    // Auto-refresh queue when a new case is shared via socket
    useEffect(() => {
        const socket = socketRef?.current;
        if (!socket || !socketReady) return;

        const handleNewReferral = (data) => {
            if (data.videoId) fetchQueue();
        };

        socket.on('receive_message', handleNewReferral);
        return () => socket.off('receive_message', handleNewReferral);
    }, [socketRef, socketReady, fetchQueue]);

    // Fetch original video as a blob when modal opens for a no-detection case
    useEffect(() => {
        if (!open || !selectedCase || selectedCase.clipUrl) return;

        let objectUrl = null;
        let cancelled = false;
        setLoadingOriginal(true);

        api.get(`/consultant/video/${selectedCase.videoId}`, { responseType: 'arraybuffer' })
        .then(response => {
            if (!cancelled) {
                const blob = new Blob([response.data], { type: 'video/mp4' });
                objectUrl = URL.createObjectURL(blob);
                setOriginalVideoUrl(objectUrl);
            }
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoadingOriginal(false); });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [open, selectedCase?.videoId]);

    const handleOpen = (c) => {
        setSelectedCase(c);
        setOpen(true);
        setIsRejecting(false);
        setRejectReason('');
        setOriginalVideoUrl(null);
        setLoadingOriginal(false);
    };

    const handleClose = () => {
        setOpen(false);
        setIsRejecting(false);
        setRejectReason('');
        setSelectedCase(null);
        setOriginalVideoUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
        setLoadingOriginal(false);
    };

    const handleVerify = async () => {
        if (!selectedCase) return;
        setSubmitting(true);
        try {
            await api.put(`/consultant/review/${selectedCase.videoId}/verify`, {
                consultantNotes: 'AI findings reviewed and verified as clinically accurate.'
            });
            setQueue(p => p.map(c =>
                c.videoId === selectedCase.videoId ? { ...c, reviewStatus: 'verified' } : c
            ));
            setSnackbar({ open: true, message: `Case verified for ${selectedCase.patientName}.`, severity: 'success' });
            handleClose();
        } catch {
            setSnackbar({ open: true, message: 'Failed to verify case.', severity: 'error' });
        } finally { setSubmitting(false); }
    };

    const handleRejectSubmit = async () => {
        if (!selectedCase || !rejectReason.trim()) return;
        setSubmitting(true);
        try {
            await api.put(`/consultant/review/${selectedCase.videoId}/reject`, {
                rejectionReason: rejectReason
            });
            setQueue(p => p.map(c =>
                c.videoId === selectedCase.videoId ? { ...c, reviewStatus: 'rejected' } : c
            ));
            setSnackbar({ open: true, message: `Case rejected for ${selectedCase.patientName}.`, severity: 'warning' });
            handleClose();
        } catch {
            setSnackbar({ open: true, message: 'Failed to reject case.', severity: 'error' });
        } finally { setSubmitting(false); }
    };

    const severityColor = (s) => ({
        High:   theme.palette.error.main,
        Medium: theme.palette.warning.main,
        Low:    theme.palette.success.main,
    }[s] || theme.palette.text.secondary);

    const statusStyle = (s) => ({
        pending:  { label: 'Pending',  color: theme.palette.warning.main },
        verified: { label: 'Verified', color: theme.palette.success.main },
        rejected: { label: 'Rejected', color: theme.palette.error.main },
    }[s] || { label: 'Pending', color: theme.palette.warning.main });

    const filtered = queue.filter(c =>
        c.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(c.videoId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.doctorName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pendingCount = queue.filter(c => c.reviewStatus === 'pending').length;

    /* ─── shared info row renderer ─── */
    const InfoRow = ({ label, value, minW = 80 }) => (
        <Box display="flex" gap={1} mb={0.5}>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: minW, flexShrink: 0 }}>
                {label}:
            </Typography>
            <Typography variant="caption" fontWeight={600}>{value || 'N/A'}</Typography>
        </Box>
    );

    return (
        <Container maxWidth="xl" sx={{ py: 2 }}>

            {/* ── Header ── */}
            <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight={800} color="text.primary">
                        Review Queue
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {loading ? 'Loading…' : `${pendingCount} pending · ${queue.length} total referrals`}
                    </Typography>
                </Box>
                <Button
                    variant="outlined" startIcon={<Refresh />}
                    onClick={fetchQueue} disabled={loading}
                    sx={{ color: ORANGE, borderColor: alpha(ORANGE, 0.5), borderRadius: '8px' }}
                >
                    Refresh
                </Button>
            </Box>

            {/* ── Search + badge ── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr auto' }, gap: 2, mb: 2 }}>
                <Paper elevation={0} sx={{
                    px: 2, py: 1, borderRadius: '10px',
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: theme.palette.background.paper,
                    display: 'flex', alignItems: 'center', gap: 1
                }}>
                    <Search sx={{ color: ORANGE, fontSize: 20 }} />
                    <TextField
                        fullWidth variant="standard"
                        placeholder="Search patient, case ID, or doctor…"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        InputProps={{ disableUnderline: true }}
                        sx={{ '& input': { fontSize: 14 } }}
                    />
                </Paper>
                <Paper elevation={0} sx={{
                    px: 3, py: 1, borderRadius: '10px',
                    bgcolor: alpha(ORANGE, 0.08),
                    border: `1px solid ${alpha(ORANGE, 0.2)}`,
                    display: 'flex', alignItems: 'center', gap: 1
                }}>
                    <LocalHospital sx={{ color: ORANGE, fontSize: 18 }} />
                    <Typography variant="body2" fontWeight={700} color={ORANGE}>
                        {pendingCount} Pending
                    </Typography>
                </Paper>
            </Box>

            {/* ── Table ── */}
            <TableContainer component={Paper} elevation={0} sx={{
                borderRadius: '12px',
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: theme.palette.background.paper,
            }}>
                {loading && <LinearProgress sx={{ borderRadius: '12px 12px 0 0' }} />}
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: alpha(ORANGE, 0.04) }}>
                            {['Patient', 'Referred By', 'Severity', 'Detections', 'Confidence', 'Date', 'Status', ''].map(h => (
                                <TableCell key={h} sx={{
                                    fontWeight: 700, fontSize: 12, py: 1.5,
                                    borderBottom: `2px solid ${alpha(ORANGE, 0.15)}`
                                }}>
                                    {h}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!loading && filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                    <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1, opacity: 0.5 }} />
                                    <Typography variant="body2" color="text.secondary">
                                        {queue.length === 0 ? 'No cases referred to you yet.' : 'No matches found.'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {filtered.map(row => {
                            const ss = statusStyle(row.reviewStatus);
                            const sc = severityColor(row.topSeverity);
                            return (
                                <TableRow key={String(row.videoId)} hover sx={{ '&:last-child td': { border: 0 } }}>
                                    <TableCell sx={{ py: 1.2 }}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: ORANGE }}>
                                                {row.patientName?.[0]?.toUpperCase()}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
                                                    {row.patientName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {row.patientAge} · {row.patientGender}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.2 }}>
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                            <Person sx={{ fontSize: 13, color: 'text.secondary' }} />
                                            <Typography variant="body2">{row.doctorName}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.2 }}>
                                        <Chip
                                            label={row.topSeverity || 'None'} size="small"
                                            sx={{
                                                fontWeight: 700, fontSize: 11,
                                                color: sc, bgcolor: alpha(sc, 0.1),
                                                borderRadius: '5px', height: 22
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ py: 1.2 }}>
                                        <Typography variant="body2" fontWeight={600}>{row.totalDetections}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.2 }}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Box sx={{ width: 48, height: 3, bgcolor: 'divider', borderRadius: 2 }}>
                                                <Box sx={{
                                                    width: `${((row.confidence || 0) * 100).toFixed(0)}%`,
                                                    height: '100%', borderRadius: 2,
                                                    bgcolor: row.confidence > 0.8 ? 'success.main' : 'warning.main'
                                                }} />
                                            </Box>
                                            <Typography variant="caption" fontWeight={700}>
                                                {((row.confidence || 0) * 100).toFixed(0)}%
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.2 }}>
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                            <AccessTime sx={{ fontSize: 12, color: 'text.secondary' }} />
                                            <Typography variant="caption">
                                                {new Date(row.referredAt || row.uploadedAt).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.2 }}>
                                        <Chip
                                            label={ss.label} size="small"
                                            sx={{
                                                fontWeight: 700, fontSize: 11,
                                                color: ss.color, bgcolor: alpha(ss.color, 0.1),
                                                borderRadius: '5px', height: 22
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ py: 1.2 }} align="right">
                                        <Tooltip title="Review Case">
                                            <IconButton
                                                onClick={() => handleOpen(row)} size="small"
                                                sx={{
                                                    color: ORANGE, bgcolor: alpha(ORANGE, 0.1),
                                                    '&:hover': { bgcolor: ORANGE, color: '#fff' },
                                                    width: 28, height: 28
                                                }}
                                            >
                                                <Visibility sx={{ fontSize: 15 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* ══════════════════════════════════════════════════════
                REVIEW MODAL  —  consistent two-column layout
            ══════════════════════════════════════════════════════ */}
            <Dialog
                open={open} onClose={handleClose}
                maxWidth="md" fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '14px',
                        backgroundImage: 'none',
                        bgcolor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        overflow: 'hidden'
                    }
                }}
            >
                {selectedCase && (() => {
                    const ss = statusStyle(selectedCase.reviewStatus);
                    return (
                        <>
                            {/* ── Modal Header ── */}
                            <DialogTitle sx={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', py: 1.5, px: 2.5,
                                borderBottom: `1px solid ${theme.palette.divider}`
                            }}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Assignment sx={{ color: ORANGE, fontSize: 20 }} />
                                    <Typography variant="subtitle1" fontWeight={700}>
                                        Case Review — {selectedCase.patientName}
                                    </Typography>
                                    <Chip
                                        label={ss.label} size="small"
                                        sx={{
                                            fontWeight: 700, fontSize: 10, height: 20,
                                            color: ss.color, bgcolor: alpha(ss.color, 0.12),
                                            borderRadius: '4px', ml: 0.5
                                        }}
                                    />
                                </Box>
                                <IconButton onClick={handleClose} size="small">
                                    <Close fontSize="small" />
                                </IconButton>
                            </DialogTitle>

                            {/* ── Two-column body ── */}
                            <DialogContent sx={{ p: 0 }}>
                                <Box sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' },
                                    minHeight: 0
                                }}>

                                    {/* ── LEFT column ── */}
                                    <Box sx={{
                                        p: 2.5,
                                        borderRight: { md: `1px solid ${theme.palette.divider}` },
                                        display: 'flex', flexDirection: 'column', gap: 2
                                    }}>

                                        {/* Patient Information */}
                                        <Paper elevation={0} sx={{
                                            p: 1.8, borderRadius: '10px',
                                            bgcolor: alpha(ORANGE, 0.06),
                                            border: `1px solid ${alpha(ORANGE, 0.2)}`
                                        }}>
                                            <Typography variant="caption" fontWeight={700} color={ORANGE}
                                                display="block" mb={1} letterSpacing={0.5}>
                                                PATIENT INFORMATION
                                            </Typography>
                                            <InfoRow label="Name"        value={selectedCase.patientName} />
                                            <InfoRow label="Age"         value={selectedCase.patientAge} />
                                            <InfoRow label="Gender"      value={selectedCase.patientGender} />
                                            <InfoRow label="Referred by" value={selectedCase.doctorName} />
                                            <InfoRow label="File"        value={selectedCase.filename} />
                                        </Paper>

                                        {/* AI Detection Summary */}
                                        <Paper elevation={0} sx={{
                                            p: 1.8, borderRadius: '10px',
                                            bgcolor: alpha(theme.palette.error.main, 0.04),
                                            border: `1px solid ${alpha(theme.palette.error.main, 0.15)}`
                                        }}>
                                            <Typography variant="caption" fontWeight={700} color="error"
                                                display="block" mb={1} letterSpacing={0.5}>
                                                AI DETECTION SUMMARY
                                            </Typography>
                                            <InfoRow label="Severity"   value={selectedCase.topSeverity || 'None'} />
                                            <InfoRow label="Detections" value={selectedCase.totalDetections} />
                                            <InfoRow label="Confidence" value={`${((selectedCase.confidence || 0) * 100).toFixed(1)}%`} />
                                            {selectedCase.reportSummary && (
                                                <Typography variant="caption" color="text.secondary"
                                                    display="block" mt={1} sx={{ lineHeight: 1.6 }}>
                                                    {selectedCase.reportSummary}
                                                </Typography>
                                            )}
                                        </Paper>

                                        {/* Detections list */}
                                        {selectedCase.detections?.length > 0 && (
                                            <Box>
                                                <Typography variant="caption" fontWeight={700} color="text.secondary"
                                                    display="block" mb={0.8} letterSpacing={0.5}>
                                                    DETECTIONS
                                                </Typography>
                                                {selectedCase.detections.map((d, i) => (
                                                    <Box key={i} sx={{
                                                        p: 1, mb: 0.8, borderRadius: '8px',
                                                        bgcolor: theme.palette.background.default,
                                                        borderLeft: `3px solid ${ORANGE}`
                                                    }}>
                                                        <Typography variant="caption" fontWeight={700} display="block">
                                                            {d.type} — {d.location}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {d.severity} · {((d.confidence || 0) * 100).toFixed(1)}%
                                                        </Typography>
                                                    </Box>
                                                ))}
                                            </Box>
                                        )}

                                        {/* Already reviewed notice */}
                                        {selectedCase.reviewStatus !== 'pending' && (
                                            <Alert
                                                severity={selectedCase.reviewStatus === 'verified' ? 'success' : 'error'}
                                                icon={selectedCase.reviewStatus === 'verified' ? <CheckCircle /> : <Warning />}
                                                sx={{ borderRadius: '8px', py: 0.5, fontSize: 12 }}
                                            >
                                                This case has already been {selectedCase.reviewStatus}.
                                            </Alert>
                                        )}
                                    </Box>

                                    {/* ── RIGHT column ── */}
                                    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>

                                        {/* Heatmap / Original Video */}
                                        <Box>
                                            <Typography variant="caption" fontWeight={700} color="text.secondary"
                                                display="block" mb={1} letterSpacing={0.5}>
                                                {selectedCase.clipUrl ? 'HEATMAP VIDEO CLIP' : 'ORIGINAL VIDEO'}
                                            </Typography>

                                            {selectedCase.clipUrl ? (
                                                <>
                                                    <video
                                                        key={selectedCase.clipUrl}
                                                        controls width="100%"
                                                        style={{
                                                            borderRadius: '10px',
                                                            backgroundColor: '#0a0a0a',
                                                            border: `1.5px solid ${alpha(ORANGE, 0.4)}`,
                                                            display: 'block',
                                                            maxHeight: '260px'
                                                        }}
                                                        onError={e => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    >
                                                        <source src={selectedCase.clipUrl} type="video/mp4" />
                                                    </video>
                                                    {/* Flask-down fallback */}
                                                    <Box sx={{
                                                        display: 'none', width: '100%', height: 160,
                                                        bgcolor: alpha('#000', 0.3), borderRadius: '10px',
                                                        border: `1.5px solid ${theme.palette.divider}`,
                                                        flexDirection: 'column',
                                                        alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        <VideoCameraBack sx={{ fontSize: 32, mb: 0.5, opacity: 0.3, color: ORANGE }} />
                                                        <Typography variant="caption" color="text.secondary" align="center">
                                                            Video unavailable — Flask may not be running
                                                        </Typography>
                                                        <Typography variant="caption" color={ORANGE} align="center"
                                                            sx={{ mt: 0.3, fontFamily: 'monospace' }}>
                                                            py -3.11 app.py
                                                        </Typography>
                                                    </Box>
                                                </>
                                            ) : loadingOriginal ? (
                                                <Box sx={{
                                                    width: '100%', height: 160,
                                                    bgcolor: alpha('#000', 0.15), borderRadius: '10px',
                                                    border: `1.5px dashed ${alpha(ORANGE, 0.25)}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <CircularProgress size={28} sx={{ color: ORANGE }} />
                                                </Box>
                                            ) : originalVideoUrl ? (
                                                <video
                                                    key={originalVideoUrl}
                                                    controls width="100%"
                                                    style={{
                                                        borderRadius: '10px',
                                                        backgroundColor: '#0a0a0a',
                                                        border: `1.5px solid ${alpha(ORANGE, 0.4)}`,
                                                        display: 'block',
                                                        maxHeight: '260px'
                                                    }}
                                                >
                                                    <source src={originalVideoUrl} type="video/mp4" />
                                                </video>
                                            ) : (
                                                <Box sx={{
                                                    width: '100%', height: 160,
                                                    bgcolor: alpha('#000', 0.15), borderRadius: '10px',
                                                    border: `1.5px dashed ${alpha(ORANGE, 0.25)}`,
                                                    display: 'flex', flexDirection: 'column',
                                                    alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <VideoCameraBack sx={{ fontSize: 32, color: alpha(ORANGE, 0.3), mb: 0.5 }} />
                                                    <Typography variant="caption" color="text.secondary">
                                                        Video unavailable
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>

                                        {/* Download PDF */}
                                        <Button
                                            fullWidth variant="outlined" size="small"
                                            onClick={async () => {
                                                try {
                                                    const token = localStorage.getItem('medvid_token');
                                                    const res = await fetch(selectedCase.reportUrl, {
                                                        headers: { Authorization: `Bearer ${token}` }
                                                    });
                                                    if (!res.ok) throw new Error('failed');
                                                    const blob = await res.blob();
                                                    const url  = URL.createObjectURL(blob);
                                                    const a    = document.createElement('a');
                                                    a.href = url;
                                                    a.download = 'MedVid-Report.pdf';
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    a.remove();
                                                    URL.revokeObjectURL(url);
                                                } catch {
                                                    setSnackbar({ open: true, message: 'Report download failed.', severity: 'error' });
                                                }
                                            }}
                                            sx={{
                                                color: ORANGE,
                                                borderColor: alpha(ORANGE, 0.4),
                                                borderRadius: '8px',
                                                fontSize: 12, py: 1
                                            }}
                                        >
                                            📄 Download Full PDF Report
                                        </Button>

                                        {/* Rejection reason textarea — shown inside right col */}
                                        {isRejecting && (
                                            <Box>
                                                <Typography variant="caption" fontWeight={700} color="error"
                                                    display="block" mb={0.5} letterSpacing={0.5}>
                                                    REJECTION REASON *
                                                </Typography>
                                                <TextField
                                                    fullWidth size="small" multiline rows={3}
                                                    placeholder="Explain why this finding needs re-analysis…"
                                                    value={rejectReason}
                                                    onChange={e => setRejectReason(e.target.value)}
                                                    error={!rejectReason.trim()}
                                                    helperText={!rejectReason.trim() ? 'Required' : ''}
                                                />
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            </DialogContent>

                            <Divider />

                            {/* ── Footer ── */}
                            <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
                                <Button onClick={handleClose} size="small"
                                    sx={{ color: 'text.secondary', fontSize: 12 }}>
                                    Cancel
                                </Button>
                                <Box flexGrow={1} />

                                {!isRejecting ? (
                                    <Button
                                        variant="outlined" color="error" size="small"
                                        startIcon={<ThumbDown sx={{ fontSize: 14 }} />}
                                        onClick={() => setIsRejecting(true)}
                                        disabled={selectedCase.reviewStatus !== 'pending'}
                                        sx={{ borderRadius: '8px', fontSize: 12 }}
                                    >
                                        Reject
                                    </Button>
                                ) : (
                                    <>
                                        <Button size="small" variant="text"
                                            onClick={() => { setIsRejecting(false); setRejectReason(''); }}
                                            sx={{ color: 'text.secondary', fontSize: 12 }}>
                                            Back
                                        </Button>
                                        <Button
                                            variant="contained" color="error" size="small"
                                            startIcon={submitting
                                                ? <CircularProgress size={12} color="inherit" />
                                                : <ThumbDown sx={{ fontSize: 14 }} />}
                                            disabled={!rejectReason.trim() || submitting}
                                            onClick={handleRejectSubmit}
                                            sx={{ borderRadius: '8px', fontSize: 12 }}
                                        >
                                            Submit Rejection
                                        </Button>
                                    </>
                                )}

                                {!isRejecting && (
                                    <Button
                                        variant="contained" size="small"
                                        startIcon={submitting
                                            ? <CircularProgress size={12} color="inherit" />
                                            : <ThumbUp sx={{ fontSize: 14 }} />}
                                        onClick={handleVerify}
                                        disabled={submitting || selectedCase.reviewStatus !== 'pending'}
                                        sx={{
                                            bgcolor: ORANGE,
                                            '&:hover': { bgcolor: alpha(ORANGE, 0.85) },
                                            '&.Mui-disabled': { bgcolor: alpha(ORANGE, 0.3) },
                                            borderRadius: '8px', px: 2.5, fontSize: 12, ml: 0.5
                                        }}
                                    >
                                        {selectedCase.reviewStatus === 'verified' ? 'Already Verified' : 'Verify Case'}
                                    </Button>
                                )}
                            </DialogActions>
                        </>
                    );
                })()}
            </Dialog>

            <Snackbar
                open={snackbar.open} autoHideDuration={4000}
                onClose={() => setSnackbar(p => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: '8px', fontSize: 13 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}