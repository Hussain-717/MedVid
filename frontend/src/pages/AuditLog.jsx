import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Container, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Chip, Button, IconButton,
    TextField, InputAdornment, useTheme, alpha, Stack,
    Divider, CircularProgress, LinearProgress, Alert
} from '@mui/material';
import {
    Search, Download, History,
    Security, Info, Warning, Error, Launch,
    FiberManualRecord, Refresh
} from '@mui/icons-material';
import api from '../services/api';

const getSeverityStyle = (severity, theme) => ({
    Critical: { color: theme.palette.error.main,   bg: alpha(theme.palette.error.main,   0.1), icon: <Error   fontSize="inherit" /> },
    Warning:  { color: theme.palette.warning.main, bg: alpha(theme.palette.warning.main, 0.1), icon: <Warning fontSize="inherit" /> },
    Info:     { color: theme.palette.info.main,    bg: alpha(theme.palette.info.main,    0.1), icon: <Info    fontSize="inherit" /> },
}[severity] || { color: theme.palette.info.main, bg: alpha(theme.palette.info.main, 0.1), icon: <Info fontSize="inherit" /> });

export default function AuditLogs() {
    const theme       = useTheme();
    const accentColor = '#FF7F50';

    const [logs,       setLogs]       = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

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

    const filtered = logs.filter(l =>
        l.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.entity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.entityId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.details?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    onChange={e => setSearchTerm(e.target.value)}
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
                            {['Timestamp', 'Action', 'Entity', 'Entity ID', 'Severity', 'Details', ''].map(h => (
                                <TableCell key={h} sx={{ fontWeight: 'bold', color: theme.palette.text.secondary, fontSize: 12 }}>
                                    {h}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!loading && filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                    <Security sx={{ fontSize: 40, opacity: 0.3, mb: 1, color: accentColor }} />
                                    <Typography variant="body2" color="text.secondary">
                                        {logs.length === 0 ? 'No activity logged yet.' : 'No matches found.'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {filtered.map((log) => {
                            const sev = getSeverityStyle(log.severity, theme);
                            return (
                                <TableRow key={String(log.id)} hover sx={{ '&:last-child td': { border: 0 } }}>
                                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.82rem', fontFamily: 'monospace', color: theme.palette.text.secondary }}>
                                        {log.timestamp}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.action}</TableCell>
                                    <TableCell sx={{ fontSize: '0.85rem' }}>{log.entity}</TableCell>
                                    <TableCell>
                                        <Chip label={log.entityId} size="small" variant="outlined"
                                            sx={{ borderRadius: '4px', fontSize: '0.72rem', maxWidth: 120, overflow: 'hidden' }} />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            icon={sev.icon} label={log.severity} size="small"
                                            sx={{ fontWeight: 'bold', color: sev.color, bgcolor: sev.bg, borderRadius: '4px' }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.82rem', color: theme.palette.text.secondary, maxWidth: 260 }}>
                                        <Typography variant="caption" noWrap title={log.details}>{log.details || '—'}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" sx={{
                                            color: accentColor, bgcolor: alpha(accentColor, 0.05),
                                            '&:hover': { bgcolor: accentColor, color: '#fff' }
                                        }}>
                                            <Launch fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
}
