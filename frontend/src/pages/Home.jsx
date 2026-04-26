import React from 'react';
import {
    Box, Typography, Button, Container, Grid, Card, CardContent,
    useTheme, Stack, Avatar,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
    Science, ArrowForward, VideoLibrary, Assessment,
    Speed, VerifiedUser, Biotech, Groups,
} from '@mui/icons-material';

const features = [
    {
        icon: <VideoLibrary />,
        title: 'Video Upload & Processing',
        description:
            'Upload endoscopy videos for new or existing patients. Supports MP4, AVI, MKV up to 500 MB with automatic patient record management.',
    },
    {
        icon: <Biotech />,
        title: 'AI-Powered Detection',
        description:
            'ResNet-50 + Temporal Transformer samples 16 frames to detect polyps and lesions with bounding-box localization and confidence scoring.',
    },
    {
        icon: <Assessment />,
        title: 'Reports & PDF Export',
        description:
            'Auto-generated diagnostic reports with detection timeline, severity rating, and annotated video clips. Export as a professional PDF.',
    },
    {
        icon: <Groups />,
        title: 'Consultant Collaboration',
        description:
            'Refer cases to specialists via built-in real-time chat. Consultants verify or reject findings and send notes back instantly.',
    },
    {
        icon: <VerifiedUser />,
        title: 'Full Audit Trail',
        description:
            'Every upload, analysis, report, and review is logged with user, timestamp, and status for complete clinical accountability.',
    },
    {
        icon: <Speed />,
        title: 'Live Dashboard',
        description:
            'Track your caseload with real-time metrics: severity breakdown, 7-day trends, unread messages, and pending reviews at a glance.',
    },
];

const steps = [
    {
        number: '01',
        title: 'Upload Endoscopy Video',
        description:
            'Add patient details and upload the endoscopy video. The system saves the patient record and immediately queues the video for AI analysis.',
    },
    {
        number: '02',
        title: 'AI Analyzes & Detects',
        description:
            'The model samples 16 uniform frames, runs temporal analysis, and returns a classification, confidence score, bounding box, and annotated video clip.',
    },
    {
        number: '03',
        title: 'Review & Collaborate',
        description:
            'View the full diagnostic report, download it as a PDF, re-run analysis, or forward the case to a consultant — all within the platform.',
    },
];

const stats = [
    { number: 'High Precision', label: 'AI Detection Engine' },
    { number: '<30s', label: 'Analysis Time' },
    { number: '2 Roles', label: 'Doctor · Consultant' },
];

export default function Home() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const accent  = isDark ? '#AED6F1' : '#3AB0A9';
    const heroBg  = isDark
        ? 'linear-gradient(160deg, #0d1b2a 0%, #1a2f4a 60%, #0d2137 100%)'
        : 'linear-gradient(160deg, #e8f4fd 0%, #f0fff8 60%, #e0f2f1 100%)';
    const ctaBg   = isDark
        ? 'linear-gradient(135deg, #0d1b2a 0%, #1a2f4a 100%)'
        : 'linear-gradient(135deg, #e0f2f1 0%, #e8f4fd 100%)';
    const navBg   = isDark ? 'rgba(31,31,31,0.95)' : 'rgba(255,255,255,0.95)';
    const chipText = isDark ? '#0d1b2a' : '#ffffff';

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>

            {/* ── Navbar ──────────────────────────────────────────────── */}
            <Box sx={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                bgcolor: navBg, backdropFilter: 'blur(10px)',
                borderBottom: '1px solid', borderColor: 'divider',
                py: 1.5, px: { xs: 2, md: 5 },
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <Typography variant="h5" fontWeight={900}
                    sx={{ color: accent, letterSpacing: 3 }}>
                    MedViD
                </Typography>
                <Stack direction="row" spacing={1.5}>
                    <Button
                        component={RouterLink} to="/login"
                        variant="outlined" size="small"
                        sx={{
                            borderColor: accent, color: accent, fontWeight: 600,
                            '&:hover': { borderColor: accent, bgcolor: `${accent}18` },
                        }}>
                        Login
                    </Button>
                    <Button
                        component={RouterLink} to="/signup"
                        variant="contained" size="small"
                        sx={{
                            bgcolor: accent, color: chipText, fontWeight: 600,
                            '&:hover': { bgcolor: accent, opacity: 0.85 },
                        }}>
                        Sign Up
                    </Button>
                </Stack>
            </Box>

            {/* ── Hero ────────────────────────────────────────────────── */}
            <Box sx={{ background: heroBg, pt: { xs: 16, md: 22 }, pb: { xs: 10, md: 16 }, textAlign: 'center' }}>
                <Container maxWidth="md">
                    {/* Badge */}
                    <Box sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 1,
                        bgcolor: `${accent}20`, color: accent,
                        px: 2, py: 0.6, borderRadius: 10, mb: 4,
                        border: `1px solid ${accent}44`,
                    }}>
                        <Science sx={{ fontSize: 15 }} />
                        <Typography variant="caption" fontWeight={700} letterSpacing={1}>
                            AI-POWERED GI ENDOSCOPY ANALYSIS
                        </Typography>
                    </Box>

                    <Typography
                        variant="h2" component="h1" fontWeight={900} mb={3}
                        sx={{ fontSize: { xs: '2.2rem', sm: '3rem', md: '3.8rem' }, lineHeight: 1.15 }}>
                        Detect Polyps.{' '}
                        <Box component="span" sx={{ color: accent }}>Save Lives.</Box>
                    </Typography>

                    <Typography
                        variant="h6" color="text.secondary" mb={5}
                        sx={{ maxWidth: 620, mx: 'auto', fontWeight: 400, lineHeight: 1.8 }}>
                        MedViD uses transformer-based AI to analyze endoscopy videos and detect
                        gastrointestinal polyps in real time, enabling faster, more accurate
                        clinical decisions.
                    </Typography>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                        <Button
                            component={RouterLink} to="/login"
                            variant="contained" size="large"
                            startIcon={<Science />}
                            sx={{
                                px: 4, py: 1.5, fontWeight: 700, borderRadius: 2,
                                bgcolor: accent, color: chipText,
                                '&:hover': { bgcolor: accent, opacity: 0.85 },
                            }}>
                            Start Analysis
                        </Button>
                        <Button
                            component={RouterLink} to="/signup"
                            variant="outlined" size="large"
                            endIcon={<ArrowForward />}
                            sx={{
                                px: 4, py: 1.5, fontWeight: 700, borderRadius: 2,
                                borderColor: accent, color: accent,
                                '&:hover': { borderColor: accent, bgcolor: `${accent}18` },
                            }}>
                            Create Account
                        </Button>
                    </Stack>
                </Container>
            </Box>

            {/* ── Stats Bar ───────────────────────────────────────────── */}
            <Box sx={{
                py: 5, bgcolor: 'background.paper',
                borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider',
            }}>
                <Container maxWidth="sm">
                    <Grid container spacing={2} justifyContent="center" alignItems="center" flexWrap="nowrap">
                        {stats.map((s, i) => (
                            <Grid item xs={4} key={i}>
                                <Box sx={{ textAlign: 'center', py: 1 }}>
                                    <Typography variant="h4" fontWeight={800} sx={{ color: accent }}>
                                        {s.number}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                                        {s.label}
                                    </Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* ── Features ────────────────────────────────────────────── */}
            <Box sx={{ py: 10 }}>
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center', mb: 7 }}>
                        <Typography variant="overline"
                            sx={{ color: accent, fontWeight: 700, letterSpacing: 3 }}>
                            CAPABILITIES
                        </Typography>
                        <Typography variant="h4" fontWeight={800} mt={1}>
                            Everything you need for GI diagnostics
                        </Typography>
                    </Box>

                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                        gap: 3,
                    }}>
                        {features.map((f, i) => (
                            <Card key={i} sx={{
                                height: 260, borderRadius: 3,
                                border: '1px solid', borderColor: 'divider',
                                bgcolor: 'background.paper',
                                transition: 'transform 0.22s, box-shadow 0.22s',
                                overflow: 'hidden',
                                '&:hover': {
                                    transform: 'translateY(-5px)',
                                    boxShadow: `0 10px 28px ${accent}30`,
                                },
                            }}>
                                <CardContent sx={{ p: 3.5 }}>
                                    <Avatar sx={{
                                        bgcolor: `${accent}20`, color: accent,
                                        width: 52, height: 52, mb: 2,
                                    }}>
                                        {f.icon}
                                    </Avatar>
                                    <Typography variant="h6" fontWeight={700} mb={1}>
                                        {f.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" lineHeight={1.75}>
                                        {f.description}
                                    </Typography>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* ── How It Works ────────────────────────────────────────── */}
            <Box sx={{ py: 10, bgcolor: 'background.paper' }}>
                <Container maxWidth="md">
                    <Box sx={{ textAlign: 'center', mb: 7 }}>
                        <Typography variant="overline"
                            sx={{ color: accent, fontWeight: 700, letterSpacing: 3 }}>
                            WORKFLOW
                        </Typography>
                        <Typography variant="h4" fontWeight={800} mt={1}>
                            From upload to diagnosis in minutes
                        </Typography>
                    </Box>

                    <Stack spacing={6}>
                        {steps.map((step, i) => (
                            <Box key={i} sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                                <Box sx={{
                                    width: 54, height: 54, borderRadius: '50%',
                                    bgcolor: accent, color: chipText, flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 900, fontSize: '0.9rem',
                                    boxShadow: `0 4px 14px ${accent}55`,
                                }}>
                                    {step.number}
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight={700} mb={0.5}>
                                        {step.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
                                        {step.description}
                                    </Typography>
                                </Box>
                            </Box>
                        ))}
                    </Stack>
                </Container>
            </Box>

            {/* ── CTA Banner ──────────────────────────────────────────── */}
            <Box sx={{ py: 12, textAlign: 'center', background: ctaBg }}>
                <Container maxWidth="sm">
                    <Typography variant="h4" fontWeight={800} mb={2}>
                        Ready to modernize your diagnostic workflow?
                    </Typography>
                    <Typography variant="body1" color="text.secondary" mb={4} lineHeight={1.8}>
                        Join doctors and hospitals already using MedViD for faster,
                        AI-assisted GI endoscopy analysis.
                    </Typography>
                    <Button
                        component={RouterLink} to="/signup"
                        variant="contained" size="large"
                        endIcon={<ArrowForward />}
                        sx={{
                            px: 5, py: 1.6, fontWeight: 700, borderRadius: 2,
                            bgcolor: accent, color: chipText,
                            '&:hover': { bgcolor: accent, opacity: 0.85 },
                        }}>
                        Get Started
                    </Button>
                </Container>
            </Box>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <Box sx={{
                py: 3, bgcolor: 'background.paper',
                borderTop: '1px solid', borderColor: 'divider',
            }}>
                <Container maxWidth="lg">
                    <Box sx={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        flexDirection: { xs: 'column', sm: 'row' }, gap: 2,
                    }}>
                        <Typography variant="caption" color="text.secondary">
                            © {new Date().getFullYear()} MedViD, AI-Assisted GI Endoscopy Diagnostics
                        </Typography>
                        <Stack direction="row" spacing={3} alignItems="center">
                            <RouterLink to="/admin/login" style={{
                                color: '#FF7F50', textDecoration: 'none',
                                fontSize: '0.8rem', fontWeight: 700,
                            }}>
                                Admin Access
                            </RouterLink>
                            <RouterLink to="/privacy" style={{
                                color: theme.palette.text.secondary,
                                textDecoration: 'none', fontSize: '0.8rem',
                            }}>
                                Privacy Policy
                            </RouterLink>
                            <RouterLink to="/terms" style={{
                                color: theme.palette.text.secondary,
                                textDecoration: 'none', fontSize: '0.8rem',
                            }}>
                                Terms of Service
                            </RouterLink>
                        </Stack>
                    </Box>
                </Container>
            </Box>

        </Box>
    );
}