import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box, Typography, Container, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TablePagination, Chip, Button, IconButton, Tooltip,
    TextField, InputAdornment, useTheme, alpha, Stack,
    Divider, CircularProgress, LinearProgress, Alert,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
    Search, Download, History,
    Security, Info, Launch,
    FiberManualRecord, Refresh,
    Login, Logout, CheckCircle, Cancel, PictureAsPdf
} from '@mui/icons-material';
import api from '../services/api';


const ACTION_META = {
    LOGIN:         { label: 'Logged In',        icon: <Login      fontSize="small" />, color: '#2196f3' },
    LOGOUT:        { label: 'Logged Out',        icon: <Logout     fontSize="small" />, color: '#9e9e9e' },
    VERIFY:        { label: 'Case Verified',     icon: <CheckCircle fontSize="small" />, color: '#4caf50' },
    REJECT:        { label: 'Case Rejected',     icon: <Cancel     fontSize="small" />, color: '#f44336' },
    EXPORT_REPORT: { label: 'Report Downloaded', icon: <PictureAsPdf fontSize="small" />, color: '#ff9800' },
};

export default function AuditLogs() {
    const theme       = useTheme();
    const accentColor = '#FF7F50';

    const [logs,         setLogs]         = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState(null);
    const [searchTerm,   setSearchTerm]   = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [page,         setPage]         = useState(0);
    const [rowsPerPage,  setRowsPerPage]  = useState(10);
    const [selectedLog,  setSelectedLog]  = useState(null);
    const [dialogVideo,  setDialogVideo]  = useState(null);
    const [loadingVideo, setLoadingVideo] = useState(false);
    const videoUrlRef = useRef(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/consultant/audit-logs');
            setLogs(res.data.logs || []);
        } catch {
            setError('Failed to load audit logs.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    useEffect(() => {
        if (!selectedLog || !['VERIFY', 'REJECT'].includes(selectedLog.action)) {
            setDialogVideo(null);
            return;
        }
        let cancelled = false;
        let parsed = null;
        try { parsed = JSON.parse(selectedLog.details); } catch { return; }
        if (!parsed?.caseId) return;

        setLoadingVideo(true);
        setDialogVideo(null);

        const fetchOriginal = () => {
            api.get(`/consultant/video/${parsed.caseId}`, { responseType: 'arraybuffer' })
                .then(res => {
                    if (cancelled) return;
                    const blob = new Blob([res.data], { type: 'video/mp4' });
                    const url  = URL.createObjectURL(blob);
                    videoUrlRef.current = url;
                    setDialogVideo(url);
                })
                .catch(() => {})
                .finally(() => { if (!cancelled) setLoadingVideo(false); });
        };

        if (parsed.clipUrl) {
            // Try heatmap clip first — fall back to original on error
            setDialogVideo(parsed.clipUrl);
            setLoadingVideo(false);
            return;
        }

        // No clip — stream the original video
        fetchOriginal();

        return () => {
            cancelled = true;
            if (videoUrlRef.current) {
                URL.revokeObjectURL(videoUrlRef.current);
                videoUrlRef.current = null;
            }
        };
    }, [selectedLog]);

    const ACTION_MAP = {
        login:   ['LOGIN'],
        logout:  ['LOGOUT'],
        verify:  ['VERIFY'],
        reject:  ['REJECT'],
    };

    const parseDetails = (log) => {
        if (['VERIFY', 'REJECT'].includes(log.action)) {
            try {
                const p = JSON.parse(log.details);
                const verdict = p.verdict === 'Verified' ? 'Verified' : 'Rejected';
                return `Patient: ${p.patientName} · ${verdict}${p.rejectionReason ? ` · Reason: ${p.rejectionReason}` : ''}${p.consultantNotes ? ` · Notes: ${p.consultantNotes}` : ''}`;
            } catch {}
        }
        return log.details || '—';
    };

    const filtered = logs.filter(l => {
        const matchesSearch =
            l.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.entity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.entityId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.details?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesAction = actionFilter === 'all' || ACTION_MAP[actionFilter]?.includes(l.action);
        return matchesSearch && matchesAction;
    });

    const handleExportCSV = () => {
        const header = 'Timestamp,Action,Entity,Entity ID,Severity,Status,Details';
        const rows = filtered.map(l =>
            [l.timestamp, l.action, l.entity, l.entityId, l.severity, l.status, `"${(l.details || '').replace(/"/g, '""')}"`].join(',')
        );
        const csv  = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `audit-logs-${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <Container maxWidth="xl" sx={{ py: 2 }}>

            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>Audit Logs</Typography>
                        <Chip
                            label="LIVE"
                            size="small"
                            icon={<FiberManualRecord sx={{ fontSize: '10px !important', color: '#4caf50' }} />}
                            sx={{ bgcolor: alpha('#4caf50', 0.1), color: '#4caf50', fontWeight: 'bold', height: 20 }}
                        />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        Your activity trail — {loading ? '…' : `${filtered.length} entries`}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined" startIcon={<Refresh />}
                        onClick={fetchLogs} disabled={loading}
                        sx={{ borderColor: alpha(accentColor, 0.5), color: accentColor, borderRadius: '8px' }}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="outlined" startIcon={<Download />}
                        onClick={handleExportCSV} disabled={loading || filtered.length === 0}
                        sx={{ borderColor: alpha(accentColor, 0.5), color: accentColor, borderRadius: '8px', fontWeight: 'bold' }}
                    >
                        Export CSV
                    </Button>
                </Stack>
            </Box>

            {/* Search bar */}
            <Paper elevation={0} sx={{
                p: 2, mb: 3, borderRadius: '12px',
                display: 'flex', gap: 2, alignItems: 'center',
                bgcolor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`
            }}>
                <TextField
                    size="small" variant="outlined"
                    placeholder="Search action, entity, or details…"
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search sx={{ color: accentColor }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ width: 350 }}
                />
                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                <Box sx={{ flexGrow: 1 }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <History sx={{ fontSize: 14 }} /> Retention: 90 Days
                </Typography>
            </Paper>

            {/* Action Filter */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                {[
                    { key: 'all',    label: 'All',    count: logs.length },
                    { key: 'login',  label: 'Login',  count: logs.filter(l => l.action === 'LOGIN').length },
                    { key: 'logout', label: 'Logout', count: logs.filter(l => l.action === 'LOGOUT').length },
                    { key: 'verify', label: 'Verify', count: logs.filter(l => l.action === 'VERIFY').length },
                    { key: 'reject', label: 'Reject', count: logs.filter(l => l.action === 'REJECT').length },
                ].map(({ key, label, count }) => (
                    <Chip
                        key={key}
                        label={`${label} (${count})`}
                        onClick={() => { setActionFilter(key); setPage(0); }}
                        sx={{
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer',
                            bgcolor: actionFilter === key ? accentColor : alpha(accentColor, 0.08),
                            color:   actionFilter === key ? '#fff' : accentColor,
                            border:  `1px solid ${alpha(accentColor, actionFilter === key ? 1 : 0.2)}`,
                            '&:hover': { bgcolor: actionFilter === key ? accentColor : alpha(accentColor, 0.15) },
                        }}
                    />
                ))}
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{error}</Alert>
            )}

            {/* Table */}
            <TableContainer component={Paper} elevation={0} sx={{
                borderRadius: '16px',
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: theme.palette.background.paper,
            }}>
                {loading && <LinearProgress sx={{ borderRadius: '16px 16px 0 0' }} />}
                <Table>
                    <TableHead sx={{ bgcolor: alpha(accentColor, 0.05) }}>
                        <TableRow>
                            {['Timestamp', 'Action', 'Details', 'Status', 'Time Ago', ''].map(h => (
                                <TableCell key={h} sx={{ fontWeight: 'bold', color: theme.palette.text.secondary, fontSize: 12 }}>
                                    {h}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!loading && filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                    <Security sx={{ fontSize: 40, opacity: 0.3, mb: 1, color: accentColor }} />
                                    <Typography variant="body2" color="text.secondary">
                                        {logs.length === 0 ? 'No activity logged yet.' : 'No matches found.'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((log) => {
                            const meta = ACTION_META[log.action] || { label: log.action, icon: <Info fontSize="small" />, color: '#9e9e9e' };
                            return (
                                <TableRow key={String(log.id)} hover sx={{ '&:last-child td': { border: 0 } }}>
                                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.82rem', fontFamily: 'monospace', color: theme.palette.text.secondary }}>
                                        {log.timestamp}
                                    </TableCell>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Box sx={{ color: meta.color, display: 'flex' }}>{meta.icon}</Box>
                                            <Typography variant="body2" fontWeight={700} sx={{ color: meta.color }}>
                                                {meta.label}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.82rem', color: theme.palette.text.secondary, maxWidth: 300 }}>
                                        <Typography variant="caption" noWrap title={parseDetails(log)}>{parseDetails(log)}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={log.status === 'failed' ? 'Failed' : 'Success'}
                                            size="small"
                                            sx={{
                                                fontWeight: 700, fontSize: 11, borderRadius: '4px',
                                                color:  log.status === 'failed' ? theme.palette.error.main   : theme.palette.success.main,
                                                bgcolor: log.status === 'failed' ? alpha(theme.palette.error.main, 0.1) : alpha(theme.palette.success.main, 0.1),
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {(() => {
                                                const diff = Date.now() - new Date(log.timestamp).getTime();
                                                const mins  = Math.floor(diff / 60000);
                                                const hours = Math.floor(diff / 3600000);
                                                const days  = Math.floor(diff / 86400000);
                                                if (mins < 1)   return 'Just now';
                                                if (mins < 60)  return `${mins}m ago`;
                                                if (hours < 24) return `${hours}h ago`;
                                                return `${days}d ago`;
                                            })()}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="View details">
                                            <IconButton size="small" onClick={() => setSelectedLog(log)} sx={{
                                                color: accentColor, bgcolor: alpha(accentColor, 0.05),
                                                '&:hover': { bgcolor: accentColor, color: '#fff' }
                                            }}>
                                                <Launch fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={filtered.length}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={[5, 10, 25]}
                    sx={{ borderTop: `1px solid ${theme.palette.divider}` }}
                />
            </TableContainer>

            {/* Log Detail Dialog */}
            {selectedLog && (() => {
                const meta      = ACTION_META[selectedLog.action] || { label: selectedLog.action, icon: <Info fontSize="small" />, color: '#9e9e9e' };
                const isCaseAction = ['VERIFY', 'REJECT'].includes(selectedLog.action);
                let parsed = null;
                if (isCaseAction) {
                    try { parsed = JSON.parse(selectedLog.details); } catch { parsed = null; }
                }
                return (
                    <Dialog open onClose={() => setSelectedLog(null)} maxWidth="sm" fullWidth
                        PaperProps={{ sx: { borderRadius: '14px' } }}>
                        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
                            <Box sx={{ color: meta.color, display: 'flex' }}>{meta.icon}</Box>
                            <Typography fontWeight={800}>{meta.label}</Typography>
                        </DialogTitle>
                        <DialogContent dividers>
                            {isCaseAction && parsed ? (
                                <Stack spacing={2}>
                                    {/* Verdict banner */}
                                    <Box sx={{
                                        p: 1.5, borderRadius: '10px', textAlign: 'center',
                                        bgcolor: parsed.verdict === 'Verified' ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                                        border: `1px solid ${parsed.verdict === 'Verified' ? theme.palette.success.main : theme.palette.error.main}`,
                                    }}>
                                        <Typography fontWeight={800} sx={{ color: parsed.verdict === 'Verified' ? 'success.main' : 'error.main' }}>
                                            {parsed.verdict === 'Verified' ? '✅ Case Verified' : '❌ Case Rejected'}
                                        </Typography>
                                    </Box>
                                    {/* Video player */}
                                    <Box sx={{
                                        width: '100%', borderRadius: '10px', overflow: 'hidden',
                                        bgcolor: '#000', aspectRatio: '16/9',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {loadingVideo ? (
                                            <CircularProgress size={28} sx={{ color: accentColor }} />
                                        ) : dialogVideo ? (
                                            <video
                                                key={dialogVideo}
                                                controls
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                onError={() => {
                                                    if (parsed?.caseId && dialogVideo !== videoUrlRef.current) {
                                                        setLoadingVideo(true);
                                                        setDialogVideo(null);
                                                        api.get(`/consultant/video/${parsed.caseId}`, { responseType: 'arraybuffer' })
                                                            .then(res => {
                                                                const blob = new Blob([res.data], { type: 'video/mp4' });
                                                                const url  = URL.createObjectURL(blob);
                                                                videoUrlRef.current = url;
                                                                setDialogVideo(url);
                                                            })
                                                            .catch(() => {})
                                                            .finally(() => setLoadingVideo(false));
                                                    }
                                                }}
                                            >
                                                <source src={dialogVideo} type="video/mp4" />
                                            </video>
                                        ) : (
                                            <Typography variant="caption" color="grey.500">Video unavailable</Typography>
                                        )}
                                    </Box>

                                    {/* Case info */}
                                    {[
                                        { label: 'Patient',   value: parsed.patientName },
                                        { label: 'Case ID',   value: parsed.caseId },
                                        { label: 'Timestamp', value: selectedLog.timestamp },
                                        parsed.verdict === 'Verified'
                                            ? { label: 'Consultant Notes', value: parsed.consultantNotes || 'No notes added' }
                                            : { label: 'Rejection Reason', value: parsed.rejectionReason },
                                    ].map(({ label, value }) => (
                                        <Box key={label}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={0.5}>
                                                {label.toUpperCase()}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>{value || '—'}</Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            ) : (
                                <Stack spacing={1.5}>
                                    {[
                                        { label: 'Timestamp', value: selectedLog.timestamp },
                                        { label: 'Details',   value: parseDetails(selectedLog) },
                                        { label: 'Status',    value: selectedLog.status === 'failed' ? 'Failed' : 'Success' },
                                        { label: 'Severity',  value: selectedLog.severity },
                                    ].map(({ label, value }) => (
                                        <Box key={label}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={0.5}>
                                                {label.toUpperCase()}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>{value}</Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                        </DialogContent>
                        <DialogActions sx={{ px: 2, py: 1.5 }}>
                            <Button onClick={() => setSelectedLog(null)} sx={{ color: accentColor, fontWeight: 700 }}>
                                Close
                            </Button>
                        </DialogActions>
                    </Dialog>
                );
            })()}
        </Container>
    );
}
