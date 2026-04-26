import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Container, Paper, Grid, TextField, Avatar, useTheme,
    Chip, Button, Divider, Skeleton, Snackbar, Alert, CircularProgress
} from '@mui/material';
import {
    AccountCircle, Email, Business, PersonPin, VerifiedUser,
    LocalHospital, Phone, Edit, Save, Cancel, CalendarMonth,
    Description, Lock
} from '@mui/icons-material';
import { getUserProfile, updateUserProfile } from '../services/api';

const CORAL = '#FF7F50';

export default function Profile() {
    const theme = useTheme();

    const [profile,  setProfile]  = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [saving,   setSaving]   = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [form,     setForm]     = useState({});
    const [toast,    setToast]    = useState({ open: false, message: '', severity: 'success' });

    const showToast  = (message, severity = 'success') => setToast({ open: true, message, severity });
    const closeToast = () => setToast(t => ({ ...t, open: false }));

    const isConsultant = profile?.role === 'Consultant';
    const accent       = isConsultant ? CORAL : theme.palette.infoHighlight;

    useEffect(() => {
        getUserProfile()
            .then(res => {
                setProfile(res.data);
                setForm({
                    name:    res.data.name    || '',
                    phone:   res.data.phone   || '',
                    purpose: res.data.purpose || '',
                });
            })
            .catch(() => showToast('Failed to load profile.', 'error'))
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await updateUserProfile({ name: form.name, phone: form.phone, purpose: form.purpose });
            setProfile(p => ({ ...p, ...res.data.user }));
            setEditMode(false);
            showToast('Profile updated successfully.');
        } catch {
            showToast('Failed to save changes.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setForm({ name: profile.name || '', phone: profile.phone || '', purpose: profile.purpose || '' });
        setEditMode(false);
    };

    const fieldSx = {
        '& .MuiOutlinedInput-root': {
            '& fieldset':             { borderColor: `${accent}40` },
            '&:hover fieldset':       { borderColor: `${accent}80` },
            '&.Mui-focused fieldset': { borderColor: accent },
        },
        '& .MuiInputLabel-root.Mui-focused': { color: accent },
    };

    // ── Read-only field ─────────────────────────────────────────────────────────
    const ReadField = ({ label, value, icon }) => (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.4 }}>
                {React.cloneElement(icon, { sx: { fontSize: 15, color: accent } })}
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.8, color: theme.palette.text.secondary, fontSize: '0.65rem', fontWeight: 600 }}>
                    {label}
                </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: theme.palette.text.primary, pl: 0.5 }}>
                {value || <span style={{ color: theme.palette.text.disabled, fontStyle: 'italic', fontWeight: 400 }}>Not provided</span>}
            </Typography>
        </Box>
    );

    // ── Skeleton ────────────────────────────────────────────────────────────────
    if (loading) return (
        <Container maxWidth="lg" sx={{ pt: 0, pb: 6 }}>
            <Skeleton variant="text" width={280} height={50} sx={{ mb: 4 }} />
            <Paper elevation={3} sx={{ p: 4, borderRadius: '16px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                    <Skeleton variant="circular" width={80} height={80} />
                    <Box sx={{ flex: 1 }}>
                        <Skeleton variant="text" width="50%" height={32} />
                        <Skeleton variant="text" width="30%" height={22} />
                    </Box>
                </Box>
                <Skeleton variant="rectangular" height={1} sx={{ mb: 3 }} />
                <Grid container spacing={3}>
                    {[0,1,2,3,4,5].map(i => <Grid item xs={12} sm={6} key={i}><Skeleton variant="rectangular" height={52} sx={{ borderRadius: 1 }} /></Grid>)}
                </Grid>
            </Paper>
        </Container>
    );

    return (
        <Container maxWidth="lg" sx={{ pt: 0, pb: 6 }}>

            <Typography variant="h4" sx={{ color: theme.palette.text.primary, fontWeight: 'bold', mb: 4 }}>
                <AccountCircle sx={{ mr: 1, fontSize: 36, verticalAlign: 'middle', color: accent }} />
                {isConsultant ? 'Specialist Profile' : 'My Profile'}
            </Typography>

            <Paper elevation={3} sx={{ p: 4, bgcolor: theme.palette.background.paper, border: `1px solid ${accent}50`, borderRadius: '16px' }}>

                {/* ── Identity header ──────────────────────────────────────── */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                    <Avatar sx={{
                        width: 80, height: 80, bgcolor: accent,
                        color: theme.palette.background.default,
                        fontSize: '2rem', fontWeight: 900,
                        boxShadow: `0 4px 16px ${accent}50`,
                        flexShrink: 0,
                    }}>
                        {(editMode ? form.name : profile?.name)?.[0]?.toUpperCase() || '?'}
                    </Avatar>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: theme.palette.text.primary }}>
                            {editMode ? form.name || 'Unnamed' : profile?.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: accent }}>
                            {profile?.designation || profile?.role}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {profile?.affiliation || 'No affiliation set'}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, flexShrink: 0 }}>
                        <Chip
                            label={isConsultant ? 'Certified Consultant' : profile?.role}
                            color={isConsultant ? 'warning' : 'info'}
                            icon={isConsultant ? <VerifiedUser /> : <LocalHospital />}
                            sx={{ fontWeight: 'bold' }}
                        />
                        {!editMode ? (
                            <Button size="small" startIcon={<Edit />} onClick={() => setEditMode(true)}
                                variant="outlined"
                                sx={{ color: accent, borderColor: `${accent}60`, textTransform: 'none' }}>
                                Edit Profile
                            </Button>
                        ) : (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button size="small" startIcon={<Cancel />} onClick={handleCancel}
                                    variant="outlined" color="inherit" sx={{ textTransform: 'none' }}>
                                    Cancel
                                </Button>
                                <Button size="small"
                                    startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}
                                    onClick={handleSave} disabled={saving} variant="contained"
                                    sx={{ bgcolor: accent, textTransform: 'none', '&:hover': { bgcolor: accent + 'cc' } }}>
                                    {saving ? 'Saving…' : 'Save'}
                                </Button>
                            </Box>
                        )}
                    </Box>
                </Box>

                <Divider sx={{ bgcolor: `${accent}20`, my: 3 }} />

                {/* ── Account (read-only) ──────────────────────────────────── */}
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2, color: accent, fontWeight: 'bold' }}>
                    <PersonPin sx={{ mr: 1, color: accent }} /> Account
                </Typography>

                <Box sx={{ p: 2, bgcolor: `${accent}05`, borderRadius: 2, borderLeft: `4px solid ${accent}`, mb: 1 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={4}>
                            <ReadField label="Email Address" value={profile?.email} icon={<Email />} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <ReadField label="Role" value={profile?.role} icon={<PersonPin />} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <ReadField
                                label="Member Since"
                                value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null}
                                icon={<CalendarMonth />}
                            />
                        </Grid>
                    </Grid>
                </Box>

                <Divider sx={{ bgcolor: `${accent}20`, my: 3 }} />

                {/* ── Verified credentials (read-only) ─────────────────────── */}
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1, color: accent, fontWeight: 'bold' }}>
                    <VerifiedUser sx={{ mr: 1, color: accent }} /> Verified Credentials
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2, lineHeight: 1.8 }}>
                    These details were verified during registration. To update them, contact the admin.
                </Typography>

                <Box sx={{ p: 2, bgcolor: `${accent}05`, borderRadius: 2, borderLeft: `4px solid ${accent}` }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <ReadField label={isConsultant ? 'Specialization' : 'Designation'} value={profile?.designation} icon={<VerifiedUser />} />
                            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.5, color: theme.palette.text.disabled }}>
                                <Lock sx={{ fontSize: 11 }} /> Contact admin to update
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <ReadField label="Affiliation / Hospital" value={profile?.affiliation} icon={<Business />} />
                            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.5, color: theme.palette.text.disabled }}>
                                <Lock sx={{ fontSize: 11 }} /> Contact admin to update
                            </Typography>
                        </Grid>
                    </Grid>
                </Box>

                <Divider sx={{ bgcolor: `${accent}20`, my: 3 }} />

                {/* ── Personal details (editable) ──────────────────────────── */}
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2, color: accent, fontWeight: 'bold' }}>
                    <AccountCircle sx={{ mr: 1, color: accent }} /> Personal Details
                </Typography>

                <Box sx={{ p: 2, bgcolor: `${accent}05`, borderRadius: 2, borderLeft: `4px solid ${accent}` }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            {editMode ? (
                                <TextField label="Full Name" value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    fullWidth size="small" sx={fieldSx}
                                    InputProps={{ startAdornment: <PersonPin sx={{ mr: 1, color: accent }} /> }} />
                            ) : (
                                <ReadField label="Full Name" value={profile?.name} icon={<PersonPin />} />
                            )}
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            {editMode ? (
                                <TextField label="Phone Number" value={form.phone}
                                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                    fullWidth size="small" sx={fieldSx}
                                    InputProps={{ startAdornment: <Phone sx={{ mr: 1, color: accent }} /> }} />
                            ) : (
                                <ReadField label="Phone Number" value={profile?.phone} icon={<Phone />} />
                            )}
                        </Grid>
                        <Grid item xs={12}>
                            {editMode ? (
                                <TextField label="Purpose / Notes" value={form.purpose}
                                    onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                                    fullWidth multiline rows={3} sx={fieldSx}
                                    InputProps={{ startAdornment: <Description sx={{ mr: 1, mt: 1, color: accent, alignSelf: 'flex-start' }} /> }} />
                            ) : (
                                <ReadField label="Purpose / Notes" value={profile?.purpose} icon={<Description />} />
                            )}
                        </Grid>
                    </Grid>
                </Box>

            </Paper>

            <Snackbar open={toast.open} autoHideDuration={4000} onClose={closeToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={closeToast} severity={toast.severity} sx={{ width: '100%' }}>
                    {toast.message}
                </Alert>
            </Snackbar>

        </Container>
    );
}
