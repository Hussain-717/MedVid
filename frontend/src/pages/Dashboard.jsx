import React, { useEffect, useState } from "react";
import {
    Container, Typography, Grid, Paper, Button, Box, useTheme,
    List, ListItem, ListItemText, ListItemIcon, LinearProgress,
    Tooltip, CircularProgress, Chip, Skeleton
} from "@mui/material";
import { Link } from "react-router-dom";
import {
    Science, History, Chat, Warning, DoneAll, CloudUpload, BarChart,
    AvTimer, TrendingUp, NotificationImportant, Visibility,
    People, CheckCircle, ErrorOutline, Speed
} from '@mui/icons-material';
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Title, Tooltip as ChartTooltip, Legend
} from "chart.js";
import api from "../services/api";

ChartJS.register(
    CategoryScale, LinearScale, PointElement,
    LineElement, Title, ChartTooltip, Legend
);

// ── Severity color helper ──────────────────────────────────────────────────────
const getSeverityColor = (theme, severity) => {
    if (severity === 'High')   return theme.palette.error.main;
    if (severity === 'Medium') return theme.palette.warning.main;
    if (severity === 'Low')    return theme.palette.success.main;
    return theme.palette.text.secondary;
};

// ── Metric card style ──────────────────────────────────────────────────────────
const getCardStyle = (theme, type) => {
    const neon    = theme.palette.infoHighlight;
    const error   = theme.palette.error.main;
    const warning = theme.palette.warning.main;
    const success = theme.palette.success.main;

    let color = neon;
    if (type === 'Pending')  color = warning;
    if (type === 'High')     color = error;
    if (type === 'Patients') color = success;

    return {
        p: 3,
        bgcolor: theme.palette.background.paper,
        borderRadius: '20px',
        border: `1px solid ${color}30`,
        boxShadow: `0 8px 20px ${color}25`,
        transition: 'all 0.3s ease',
        height: '100%',
        '&:hover': {
            boxShadow: `0 8px 30px ${color}55`,
            transform: 'translateY(-4px)',
        },
    };
};

// ── Skeleton loader for metric card ───────────────────────────────────────────
const MetricSkeleton = () => (
    <Box sx={{ p: 3 }}>
        <Skeleton variant="circular" width={36} height={36} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="60%" height={60} />
        <Skeleton variant="text" width="80%" />
    </Box>
);

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Dashboard() {
    const theme        = useTheme();
    const neon         = theme.palette.infoHighlight;
    const paperBg      = theme.palette.background.paper;

    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    // ── Fetch real data ────────────────────────────────────────────
    const fetchDashboard = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/dashboard');
            setData(response.data);
        } catch (err) {
            setError('Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
        // Auto-refresh every 60 seconds
        const interval = setInterval(fetchDashboard, 60000);
        return () => clearInterval(interval);
    }, []);

    // ── Build chart from real trend data ───────────────────────────
    const chartData = data ? {
        labels:   data.trend.labels,
        datasets: [
            {
                label:           'High Severity',
                data:            data.trend.high,
                borderColor:     '#FF6B6B',
                backgroundColor: 'rgba(255,107,107,0.15)',
                tension: 0.4,
                pointRadius: 4,
            },
            {
                label:           'Medium Severity',
                data:            data.trend.medium,
                borderColor:     '#FFD93D',
                backgroundColor: 'rgba(255,217,61,0.15)',
                tension: 0.4,
                pointRadius: 4,
            },
            {
                label:           'Low Severity',
                data:            data.trend.low,
                borderColor:     '#4DD599',
                backgroundColor: 'rgba(77,213,153,0.15)',
                tension: 0.4,
                pointRadius: 4,
            },
        ]
    } : null;

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
                labels: { color: theme.palette.text.secondary }
            },
            tooltip: { mode: 'index', intersect: false }
        },
        scales: {
            x: {
                ticks: { color: theme.palette.text.secondary, maxRotation: 30 },
                grid:  { color: theme.palette.divider }
            },
            y: {
                ticks: { color: theme.palette.text.secondary, stepSize: 1 },
                grid:  { color: theme.palette.divider },
                beginAtZero: true
            }
        }
    };

    // ── Metrics config ─────────────────────────────────────────────
    const metrics = data ? [
        {
            label:   "Completed Analysis",
            value:   data.metrics.completedVideos,
            icon:    <DoneAll sx={{ color: neon, fontSize: 36 }} />,
            type:    "Completed",
            sub:     `${data.metrics.totalVideos} total uploads`,
        },
        {
            label:   "Awaiting Processing",
            value:   data.metrics.pendingVideos,
            icon:    <AvTimer sx={{ color: theme.palette.warning.main, fontSize: 36 }} />,
            type:    "Pending",
            sub:     "Currently processing",
        },
        {
            label:   "Total Abnormalities",
            value:   data.metrics.totalDetections,
            icon:    <Warning sx={{ color: theme.palette.error.main, fontSize: 36 }} />,
            type:    "High",
            sub:     `High: ${data.metrics.highCount} · Med: ${data.metrics.mediumCount} · Low: ${data.metrics.lowCount}`,
            progress: data.metrics.totalVideos > 0
                ? Math.round((data.metrics.highCount / Math.max(data.metrics.totalVideos, 1)) * 100)
                : 0,
        },
        {
            label:   "Total Patients",
            value:   data.metrics.totalPatients,
            icon:    <People sx={{ color: theme.palette.success.main, fontSize: 36 }} />,
            type:    "Patients",
            sub:     `Avg confidence: ${data.metrics.avgConfidence}%`,
        },
    ] : [];

    return (
        <Container maxWidth="lg" sx={{ p: 0, display: "flex", flexDirection: "column", flexGrow: 1 }}>

            {/* ── Title ─────────────────────────────────────────────── */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" sx={{
                    color: theme.palette.text.primary,
                    fontWeight: 'bold',
                    textShadow: `0 0 15px ${neon}80`
                }}>
                    AI DIAGNOSTIC CONSOLE
                </Typography>
                <Button
                    size="small"
                    variant="outlined"
                    onClick={fetchDashboard}
                    disabled={loading}
                    sx={{ color: neon, borderColor: neon + '60', borderRadius: '10px' }}
                >
                    {loading ? 'Refreshing...' : 'Refresh'}
                </Button>
            </Box>

            {error && (
                <Box sx={{ mb: 3, p: 2, bgcolor: theme.palette.error.main + '15', borderRadius: 2, border: `1px solid ${theme.palette.error.main}40` }}>
                    <Typography color="error">{error}</Typography>
                </Box>
            )}

            {/* ── Metric Cards ───────────────────────────────────────── */}
            <Grid container spacing={3} mb={5}>
                {loading
                    ? [0,1,2,3].map(i => (
                        <Grid xs={12} sm={6} md={3} key={i}>
                            <Paper elevation={4} sx={{ borderRadius: '20px', overflow: 'hidden' }}>
                                <MetricSkeleton />
                            </Paper>
                        </Grid>
                    ))
                    : metrics.map((metric, i) => (
                        <Grid xs={12} sm={6} md={3} key={i}>
                            <Paper elevation={8} sx={getCardStyle(theme, metric.type)}>
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                    {metric.icon}
                                    {data.metrics.unreadMessages > 0 && metric.type === 'Patients' && (
                                        <Chip
                                            label={`${data.metrics.unreadMessages} unread`}
                                            size="small"
                                            color="error"
                                            sx={{ fontSize: '0.65rem', height: 20 }}
                                        />
                                    )}
                                </Box>
                                <Typography variant="h2" sx={{
                                    color: metric.type === 'High'
                                        ? theme.palette.error.main
                                        : metric.type === 'Patients'
                                        ? theme.palette.success.main
                                        : neon,
                                    fontWeight: '900',
                                    letterSpacing: 1
                                }}>
                                    {metric.value}
                                </Typography>
                                <Typography variant="body2" sx={{
                                    color: theme.palette.text.secondary,
                                    mt: 0.5,
                                    textTransform: 'uppercase',
                                    fontSize: '0.7rem'
                                }}>
                                    {metric.label}
                                </Typography>
                                <Typography variant="caption" sx={{
                                    color: theme.palette.text.secondary,
                                    opacity: 0.7,
                                    display: 'block',
                                    mt: 0.5
                                }}>
                                    {metric.sub}
                                </Typography>
                                {metric.progress !== undefined && (
                                    <LinearProgress
                                        variant="determinate"
                                        value={metric.progress}
                                        sx={{
                                            mt: 1.5, height: 4,
                                            bgcolor: theme.palette.background.default,
                                            '& .MuiLinearProgress-bar': { bgcolor: theme.palette.error.main }
                                        }}
                                    />
                                )}
                            </Paper>
                        </Grid>
                    ))
                }
            </Grid>

            <Box sx={{ borderBottom: `1px dashed ${neon}30`, mb: 4 }} />

            {/* ── Chart + Recent Activity ───────────────────────────── */}
            <Grid container spacing={4}>

                {/* Trend Chart */}
                <Grid xs={12} md={7}>
                    <Paper elevation={8} sx={{
                        p: 4, bgcolor: paperBg,
                        border: `1px solid ${neon}30`,
                        borderRadius: '24px', height: '100%',
                        boxShadow: `0 4px 15px ${neon}15`
                    }}>
                        <Typography variant="h6" sx={{
                            color: neon, display: 'flex',
                            alignItems: 'center', mb: 3,
                            textTransform: 'uppercase'
                        }}>
                            <BarChart sx={{ mr: 1 }} /> Severity Trend — Last 7 Days
                        </Typography>

                        {loading ? (
                            <Box sx={{ height: 300 }}>
                                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
                            </Box>
                        ) : chartData ? (
                            <Line data={chartData} options={chartOptions} />
                        ) : (
                            <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography color="text.secondary">No data available</Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Quick Actions + Recent Reports */}
                <Grid xs={12} md={5}>
                    <Paper elevation={8} sx={{
                        p: 4, bgcolor: paperBg,
                        border: `1px solid ${neon}30`,
                        borderRadius: '24px', height: '100%',
                        boxShadow: `0 4px 15px ${neon}15`
                    }}>
                        <Typography variant="h6" sx={{ color: neon, mb: 2, textTransform: 'uppercase' }}>
                            Access Points
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
                            <Button
                                component={Link} to="/upload"
                                variant="contained"
                                startIcon={<CloudUpload />}
                                fullWidth
                                sx={{
                                    bgcolor: neon, color: paperBg, fontWeight: 'bold',
                                    borderRadius: '12px',
                                    '&:hover': { bgcolor: neon + '99', boxShadow: `0 0 15px ${neon}99` }
                                }}
                            >
                                Start New Diagnostic
                            </Button>
                            <Button
                                component={Link} to="/history"
                                variant="outlined"
                                startIcon={<History />}
                                fullWidth
                                sx={{
                                    color: neon, borderColor: neon,
                                    borderRadius: '12px',
                                    '&:hover': { bgcolor: neon + '10', boxShadow: `0 0 15px ${neon}50` }
                                }}
                            >
                                View All History
                            </Button>
                        </Box>

                        <Typography variant="h6" sx={{
                            color: neon, mb: 1,
                            borderBottom: `1px solid ${neon}20`,
                            pb: 1, textTransform: 'uppercase'
                        }}>
                            Latest Analysis Logs
                        </Typography>

                        {loading ? (
                            [0,1,2,3,4].map(i => (
                                <Skeleton key={i} variant="rectangular" height={52} sx={{ borderRadius: 2, mb: 1 }} />
                            ))
                        ) : data?.recentReports?.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Typography color="text.secondary">No analysis yet.</Typography>
                                <Button component={Link} to="/upload" size="small" sx={{ mt: 1, color: neon }}>
                                    Upload your first video
                                </Button>
                            </Box>
                        ) : (
                            <List dense disablePadding>
                                {data?.recentReports?.map((report) => (
                                    <Tooltip
                                        key={report.videoId}
                                        title={`${report.detections} detection(s) · ${report.status}`}
                                        placement="right"
                                    >
                                        <ListItem
                                            component={Link}
                                            to={`/results/${report.videoId}`}
                                            sx={{
                                                my: 0.8,
                                                borderLeft: `5px solid ${getSeverityColor(theme, report.severity)}`,
                                                bgcolor: theme.palette.background.default,
                                                borderRadius: '8px',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                                '&:hover': {
                                                    bgcolor: neon + '15',
                                                    boxShadow: `0 2px 10px ${neon}30`,
                                                },
                                            }}
                                        >
                                            <ListItemIcon>
                                                <Visibility sx={{ color: getSeverityColor(theme, report.severity) }} />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={report.patientName}
                                                secondary={new Date(report.uploadedAt).toLocaleDateString()}
                                                primaryTypographyProps={{ color: theme.palette.text.primary, fontWeight: 'bold', fontSize: '0.85rem' }}
                                                secondaryTypographyProps={{ color: theme.palette.text.secondary, fontSize: '0.75rem' }}
                                            />
                                            <Chip
                                                label={report.severity}
                                                size="small"
                                                sx={{
                                                    bgcolor: getSeverityColor(theme, report.severity) + '20',
                                                    color:   getSeverityColor(theme, report.severity),
                                                    fontWeight: 'bold',
                                                    fontSize: '0.65rem',
                                                    height: 20
                                                }}
                                            />
                                        </ListItem>
                                    </Tooltip>
                                ))}
                            </List>
                        )}
                    </Paper>
                </Grid>
            </Grid>

        </Container>
    );
}