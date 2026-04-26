import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
    Container, Typography, Paper, Table, TableHead, TableRow, TableCell,
    TableBody, Button, CircularProgress, Box, TextField, TablePagination,
    Avatar, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
    useTheme, IconButton, MenuItem, Tooltip, Snackbar, Alert
} from "@mui/material";
import {
    Search as SearchIcon, Clear as ClearIcon, Visibility as VisibilityIcon,
    Report as ReportIcon, Delete as DeleteIcon, FileDownload, Refresh
} from "@mui/icons-material";
import { getHistory, reRunAnalysis, deleteAnalysis, exportReport } from "../services/api";

const getSeverityChipColor = (severity, theme) => {
    const s = severity?.toLowerCase();
    const darkText = theme.palette.text.primary;
    if (s === 'high')   return { bgcolor: theme.palette.error.main,    color: darkText, fontWeight: 'bold' };
    if (s === 'medium') return { bgcolor: theme.palette.warning.main,   color: darkText, fontWeight: 'bold' };
    if (s === 'low')    return { bgcolor: theme.palette.infoHighlight,  color: darkText, fontWeight: 'bold' };
    return { bgcolor: theme.palette.background.default, color: theme.palette.text.secondary, border: `1px solid ${theme.palette.text.secondary}50` };
};

const getStatusChipColor = (status, theme) => {
    const s = status?.toLowerCase();
    const highlight = theme.palette.infoHighlight;
    if (s === 'pending'    || s === 'queued')     return { bgcolor: theme.palette.warning.main + '30', color: theme.palette.warning.main, fontWeight: 'bold' };
    if (s === 'processing')                        return { bgcolor: theme.palette.info.main    + '30', color: theme.palette.info.main,    fontWeight: 'bold' };
    if (s === 'completed')                         return { bgcolor: highlight                  + '30', color: highlight,                  fontWeight: 'bold' };
    if (s === 'failed')                            return { bgcolor: theme.palette.error.main   + '30', color: theme.palette.error.main,   fontWeight: 'bold' };
    return { bgcolor: theme.palette.text.secondary + '10', color: theme.palette.text.secondary, fontWeight: 'bold' };
};

const FilterDropdown = ({ label, options, value, onChange, theme }) => (
    <TextField
        select label={label} size="small" value={value} onChange={onChange}
        sx={{
            minWidth: 120,
            '& .MuiInputBase-input': { color: theme.palette.text.primary },
            '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: theme.palette.infoHighlight + '50' } }
        }}
    >
        <MenuItem value="">— All {label} —</MenuItem>
        {options.map((option) => (
            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
        ))}
    </TextField>
);

export default function History() {
    const theme = useTheme();

    const [history,       setHistory]       = useState([]);
    const [loading,       setLoading]       = useState(false);
    const [error,         setError]         = useState(null);
    const [page,          setPage]          = useState(0);
    const [rowsPerPage,   setRowsPerPage]   = useState(10);
    const [total,         setTotal]         = useState(0);
    const [q,             setQ]             = useState("");
    const [severityFilter,setSeverityFilter] = useState('');
    const [statusFilter,  setStatusFilter]  = useState('');
    const [sortField,     setSortField]     = useState('uploadedAt');
    const [sortOrder,     setSortOrder]     = useState('desc');

    // Delete dialog
    const [deleteTarget,  setDeleteTarget]  = useState(null);

    // Re-run dialog
    const [rerunTarget,   setRerunTarget]   = useState(null);
    const [rerunning,     setRerunning]     = useState(false);

    // Snackbar toast
    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
    const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });
    const closeToast = () => setToast(t => ({ ...t, open: false }));

    const severityOptions = [
        { value: 'High',   label: 'High'   },
        { value: 'Medium', label: 'Medium' },
        { value: 'Low',    label: 'Low'    },
    ];
    const statusOptions = [
        { value: 'completed',  label: 'Completed'  },
        { value: 'processing', label: 'Processing' },
        { value: 'failed',     label: 'Failed'     },
    ];

    const handleApplyFilters = () => { setPage(0); fetchHistory(); };

    const handleClearFilters = () => {
        setQ(""); setSeverityFilter(""); setStatusFilter(""); setPage(0);
    };

    const handleSort = (field) => {
        setSortOrder(sortField === field && sortOrder === 'asc' ? 'desc' : 'asc');
        setSortField(field);
    };

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getHistory({
                page: page + 1,
                pageSize: rowsPerPage,
                query: q,
                severity: severityFilter,
                status: statusFilter,
                sortField,
                sortOrder,
            });
            const items = res?.data?.items || [];
            setHistory(items);
            setTotal(res?.data?.total ?? items.length);
        } catch (err) {
            setError(err?.message || "Failed to fetch history.");
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, q, severityFilter, statusFilter, sortField, sortOrder]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    // Re-run
    const confirmReRun = async () => {
        if (!rerunTarget) return;
        const targetId = rerunTarget.videoId || rerunTarget.id;
        setRerunning(true);
        try {
            await reRunAnalysis(targetId);
            showToast('Analysis re-queued successfully.');
            setRerunTarget(null);
            fetchHistory();
        } catch {
            showToast('Failed to re-run analysis.', 'error');
        } finally {
            setRerunning(false);
        }
    };

    // Delete
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const targetId = deleteTarget.videoId || deleteTarget.id;
        try {
            await deleteAnalysis(targetId);
            setHistory(prev => prev.filter(i => (i.videoId || i.id) !== targetId));
            setTotal(t => t - 1);
            setDeleteTarget(null);
            showToast('Record deleted successfully.');
        } catch {
            showToast('Failed to delete record.', 'error');
        }
    };

    // Export
    const handleExport = async (item) => {
        const targetId = item.videoId || item.id;
        try {
            await exportReport(targetId);
        } catch {
            showToast('Failed to export report.', 'error');
        }
    };

    const renderSortIndicator = (field) => {
        if (sortField !== field) return null;
        return sortOrder === 'asc' ? ' ▲' : ' ▼';
    };

    const highlight      = theme.palette.infoHighlight;
    const tableHeadStyle = { color: highlight, fontWeight: 'bold', cursor: 'pointer' };
    const tableCellStyle = { color: theme.palette.text.primary };

    return (
        <Container sx={{ mt: 4, mb: 4 }} maxWidth="xl">
            <Typography variant="h4" gutterBottom sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>
                <ReportIcon sx={{ mr: 1, color: highlight }} /> Analysis History
            </Typography>

            {/* ── Filters ─────────────────────────────────────────────── */}
            <Paper sx={{ p: 2, mb: 2, bgcolor: theme.palette.background.paper }}>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                    <TextField
                        size="small"
                        placeholder="Search patient…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                        sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: highlight + '50' } } }}
                    />
                    <FilterDropdown label="Severity" options={severityOptions} value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} theme={theme} />
                    <FilterDropdown label="Status"   options={statusOptions}   value={statusFilter}   onChange={(e) => setStatusFilter(e.target.value)}   theme={theme} />
                    <Button variant="contained"  onClick={handleApplyFilters} startIcon={<SearchIcon />}  sx={{ bgcolor: highlight, color: theme.palette.background.paper }}>Filter</Button>
                    <Button variant="outlined"   onClick={handleClearFilters} startIcon={<ClearIcon />}   sx={{ color: highlight, borderColor: highlight + '60' }}>Clear</Button>
                </Box>
            </Paper>

            {error && (
                <Box sx={{ mb: 2, p: 2, bgcolor: theme.palette.error.main + '15', borderRadius: 2, border: `1px solid ${theme.palette.error.main}40` }}>
                    <Typography color="error">{error}</Typography>
                </Box>
            )}

            {/* ── Table ───────────────────────────────────────────────── */}
            <Paper sx={{ overflowX: "auto", bgcolor: theme.palette.background.paper }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                        <CircularProgress sx={{ color: highlight }} />
                    </Box>
                ) : history.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                        <Typography color="text.secondary">No records found.</Typography>
                    </Box>
                ) : (
                    <Table sx={{ minWidth: 1000 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell onClick={() => handleSort('patientName')} sx={tableHeadStyle}>Patient {renderSortIndicator('patientName')}</TableCell>
                                <TableCell sx={{ color: highlight }}>Preview</TableCell>
                                <TableCell onClick={() => handleSort('videoId')}    sx={tableHeadStyle}>Case ID {renderSortIndicator('videoId')}</TableCell>
                                <TableCell onClick={() => handleSort('uploadedAt')} sx={tableHeadStyle}>Date {renderSortIndicator('uploadedAt')}</TableCell>
                                <TableCell sx={{ color: highlight }}>Status</TableCell>
                                <TableCell sx={{ color: highlight }}>Severity</TableCell>
                                <TableCell align="right" sx={{ color: highlight }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {history.map((item) => {
                                const id = item.videoId || item.id || "unknown";
                                return (
                                    <TableRow key={id} hover>
                                        <TableCell sx={tableCellStyle}>{item.patientName || 'N/A'}</TableCell>
                                        <TableCell><Avatar variant="circular" src={item.previewFrame} /></TableCell>
                                        <TableCell sx={{ ...tableCellStyle, fontFamily: 'monospace', fontSize: '0.75rem' }}>{id}</TableCell>
                                        <TableCell sx={tableCellStyle}>{new Date(item.uploadedAt).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Chip label={item.status || 'Unknown'} size="small" sx={getStatusChipColor(item.status, theme)} />
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={item.topSeverity || '—'} size="small" sx={getSeverityChipColor(item.topSeverity, theme)} />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="View Results">
                                                <IconButton component={Link} to={`/results/${id}`} size="small" sx={{ color: highlight }}>
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Re-run Analysis">
                                                <IconButton onClick={() => setRerunTarget(item)} size="small" sx={{ color: theme.palette.info.main }}>
                                                    <Refresh fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Export Report">
                                                <IconButton onClick={() => handleExport(item)} size="small" sx={{ color: theme.palette.success.main }}>
                                                    <FileDownload fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton onClick={() => setDeleteTarget(item)} size="small" color="error">
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={[5, 10, 25]}
                />
            </Paper>

            {/* ── Re-run Dialog ────────────────────────────────────────── */}
            <Dialog open={!!rerunTarget} onClose={() => setRerunTarget(null)}>
                <DialogTitle sx={{ color: theme.palette.info.main }}>Re-run Analysis</DialogTitle>
                <DialogContent>
                    <Typography>
                        Re-queue analysis for patient <strong>{rerunTarget?.patientName || 'this record'}</strong>?
                        The current results will be overwritten once processing completes.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRerunTarget(null)} disabled={rerunning}>Cancel</Button>
                    <Button
                        onClick={confirmReRun}
                        variant="contained"
                        disabled={rerunning}
                        sx={{ bgcolor: theme.palette.info.main }}
                        startIcon={<Refresh />}
                    >
                        {rerunning ? 'Queuing…' : 'Re-run'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Delete Dialog ────────────────────────────────────────── */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
                <DialogTitle sx={{ color: theme.palette.error.main }}>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Permanently delete the record for <strong>{deleteTarget?.patientName || 'this patient'}</strong>?
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
                    <Button onClick={confirmDelete} variant="contained" color="error" startIcon={<DeleteIcon />}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Toast ───────────────────────────────────────────────── */}
            <Snackbar open={toast.open} autoHideDuration={4000} onClose={closeToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={closeToast} severity={toast.severity} sx={{ width: '100%' }}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}
