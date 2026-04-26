import React, { useEffect, useState } from 'react';
import {
    Container, Typography, Box, Paper, Button, Grid,
    useTheme, alpha, Divider, Stack, CircularProgress, Chip
} from '@mui/material';
import {
    History, Security, Chat,
    ArrowForward, CheckCircle, Timer, AssignmentLate,
    ThumbUp, ThumbDown, Pending
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ConsDashboard() {
    const navigate    = useNavigate();
    const theme       = useTheme();
    const accentColor = '#FF7F50';

    const user = JSON.parse(localStorage.getItem('medvid_user') || '{}');

    const [stats,   setStats]   = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const response = await api.get('/consultant/stats');
                setStats(response.data);
            } catch (err) {
                console.error('Failed to load consultant stats:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const summaryData = stats ? [
        {
            icon:  <AssignmentLate />,
            label: 'Awaiting Review',
            value: String(stats.pending),
            color: accentColor,
            path:  '/history'
        },
        {
            icon:  <CheckCircle />,
            label: 'Cases Verified',
            value: String(stats.verified),
            color: '#64FFDA',
            path:  '#'
        },
        {
            icon:  <Timer />,
            label: 'Avg AI Confidence',
            value: `${stats.avgConfidence}%`,
            color: '#F0D43A',
            path:  '#'
        },
    ] : [];

    return (
        <Container maxWidth="xl" sx={{ py: 2 }}>

            {/* ── Header ─────────────────────────────────────────── */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.text.primary }}>
                    Consultation Hub
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Welcome back, <strong>{user.name || user.email?.split('@')[0] || 'Consultant'}</strong>.
                    {stats && ` You have ${stats.pending} case(s) awaiting your review.`}
                </Typography>
            </Box>

            {/* ── Stats Cards ─────────────────────────────────────── */}
            <Grid container spacing={3} sx={{ mb: 5 }}>
                {loading ? (
                    [0,1,2].map(i => (
                        <Grid item xs={12} sm={4} key={i}>
                            <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 88 }}>
                                <CircularProgress size={24} sx={{ color: accentColor }} />
                            </Paper>
                        </Grid>
                    ))
                ) : summaryData.map((item, index) => (
                    <Grid item xs={12} sm={4} key={index}>
                        <Paper
                            elevation={0}
                            onClick={() => item.path !== '#' && navigate(item.path)}
                            sx={{
                                p: 3, borderRadius: '16px',
                                border: `1px solid ${theme.palette.divider}`,
                                display: 'flex', alignItems: 'center', gap: 2,
                                cursor: item.path !== '#' ? 'pointer' : 'default',
                                transition: 'all 0.2s ease',
                                '&:hover': item.path !== '#' ? {
                                    transform: 'translateY(-4px)',
                                    boxShadow: `0 8px 24px ${alpha(item.color, 0.15)}`,
                                    borderColor: item.color
                                } : {}
                            }}
                        >
                            <Box sx={{ bgcolor: alpha(item.color, 0.1), color: item.color, p: 1.5, borderRadius: '12px', display: 'flex' }}>
                                {item.icon}
                            </Box>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 800 }}>{item.value}</Typography>
                                <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                            </Box>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* ── Review Status Summary ───────────────────────────── */}
            {stats && (
                <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="h6" fontWeight={700} mb={2}>Case Review Summary</Typography>
                    <Box display="flex" gap={2} flexWrap="wrap">
                        <Chip icon={<Pending />}     label={`${stats.pending} Pending`}  sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main, fontWeight: 'bold' }} />
                        <Chip icon={<ThumbUp />}     label={`${stats.verified} Verified`} sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main, fontWeight: 'bold' }} />
                        <Chip icon={<ThumbDown />}   label={`${stats.rejected} Rejected`} sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main, fontWeight: 'bold' }} />
                        <Chip label={`${stats.totalReferrals} Total Referrals`} sx={{ bgcolor: alpha(accentColor, 0.1), color: accentColor, fontWeight: 'bold' }} />
                    </Box>
                </Paper>
            )}

            <Grid container spacing={4}>

                {/* ── Quick Actions ───────────────────────────────── */}
                <Grid item xs={12} md={7}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Quick Actions</Typography>
                    <Stack spacing={2}>
                        {[
                            {
                                icon: <History sx={{ color: accentColor }} />,
                                title: 'Review Queue',
                                desc:  'Verify or reject AI findings for referred endoscopy cases',
                                path:  '/history',
                                label: 'Open Queue'
                            },
                            {
                                icon: <Security sx={{ color: accentColor }} />,
                                title: 'Audit Logs',
                                desc:  'Review system access and diagnostic exports',
                                path:  '/logs',
                                label: 'View Logs'
                            },
                            {
                                icon: <Chat sx={{ color: accentColor }} />,
                                title: 'Doctor Chat',
                                desc:  'Discuss case findings with referring physicians',
                                path:  '/consultant',
                                label: 'Open Chat'
                            }
                        ].map((item, i) => (
                            <Paper key={i} elevation={0} sx={{
                                p: 3, borderRadius: '16px',
                                border: `1px solid ${theme.palette.divider}`,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <Box display="flex" gap={2} alignItems="center">
                                    {item.icon}
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight="bold">{item.title}</Typography>
                                        <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                                    </Box>
                                </Box>
                                <Button
                                    onClick={() => navigate(item.path)}
                                    endIcon={<ArrowForward />}
                                    sx={{ color: accentColor, minWidth: 100 }}
                                >
                                    {item.label}
                                </Button>
                            </Paper>
                        ))}
                    </Stack>
                </Grid>

                {/* ── Recent Alerts ───────────────────────────────── */}
                <Grid item xs={12} md={5}>
                    <Paper elevation={0} sx={{
                        p: 3, borderRadius: '16px',
                        border: `1px solid ${theme.palette.divider}`, height: '100%'
                    }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Workflow Status</Typography>
                        <Stack spacing={2} divider={<Divider />}>
                            <Box>
                                <Typography variant="caption" color={accentColor} fontWeight="bold">QUEUE</Typography>
                                <Typography variant="body2">
                                    {stats ? `${stats.pending} case(s) waiting for your review` : 'Loading...'}
                                </Typography>
                                <Button size="small" onClick={() => navigate('/history')} sx={{ color: accentColor, p: 0, mt: 0.5 }}>
                                    Go to Review Queue →
                                </Button>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="success.main" fontWeight="bold">COMPLETED</Typography>
                                <Typography variant="body2">
                                    {stats ? `${stats.verified} case(s) verified · ${stats.rejected} rejected` : 'Loading...'}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">PERFORMANCE</Typography>
                                <Typography variant="body2">
                                    {stats ? `Average AI confidence on verified cases: ${stats.avgConfidence}%` : 'Loading...'}
                                </Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
}