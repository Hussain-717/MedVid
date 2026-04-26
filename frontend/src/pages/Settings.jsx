import React, { useState, useContext } from 'react';
import {
    Box, Typography, Container, Paper, useTheme, Switch, Divider,
    TextField, Button, IconButton, InputAdornment, CircularProgress,
    Snackbar, Alert
} from '@mui/material';
import {
    Settings as SettingsIcon, Palette, Notifications,
    Lock, Visibility, VisibilityOff
} from '@mui/icons-material';
import { ColorModeContext } from '../context/ThemeContext';
import { changePassword } from '../services/api';

const CORAL = '#FF7F50';

export default function Settings() {
    const theme     = useTheme();
    const colorMode = useContext(ColorModeContext);

    const user         = JSON.parse(localStorage.getItem('medvid_user') || '{}');
    const isConsultant = user.role === 'Consultant';
    const accent       = isConsultant ? CORAL : theme.palette.infoHighlight;

    const [notifications, setNotifications] = useState(
        () => localStorage.getItem('medvid_notifications') !== 'false'
    );
    const handleNotificationToggle = (e) => {
        setNotifications(e.target.checked);
        localStorage.setItem('medvid_notifications', String(e.target.checked));
    };

    const [pwForm,   setPwForm]   = useState({ current: '', next: '', confirm: '' });
    const [showPw,   setShowPw]   = useState({ current: false, next: false, confirm: false });
    const [pwSaving, setPwSaving] = useState(false);

    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
    const showToast  = (message, severity = 'success') => setToast({ open: true, message, severity });
    const closeToast = () => setToast(t => ({ ...t, open: false }));

    const handleChangePassword = async () => {
        if (!pwForm.current || !pwForm.next || !pwForm.confirm)
            return showToast('Please fill in all password fields.', 'warning');
        if (pwForm.next.length < 6)
            return showToast('New password must be at least 6 characters.', 'warning');
        if (pwForm.next !== pwForm.confirm)
            return showToast('New passwords do not match.', 'error');
        setPwSaving(true);
        try {
            await changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next });
            setPwForm({ current: '', next: '', confirm: '' });
            showToast('Password changed successfully.');
        } catch (err) {
            showToast(err?.response?.data?.message || 'Failed to change password.', 'error');
        } finally {
            setPwSaving(false);
        }
    };

    const switchSx = {
        '& .MuiSwitch-switchBase.Mui-checked':                    { color: accent },
        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: accent },
    };

    const fieldSx = {
        '& .MuiOutlinedInput-root': {
            '& fieldset':             { borderColor: `${accent}40` },
            '&:hover fieldset':       { borderColor: `${accent}80` },
            '&.Mui-focused fieldset': { borderColor: accent },
        },
        '& .MuiInputLabel-root.Mui-focused': { color: accent },
    };

    return (
        <Container maxWidth="lg" sx={{ pt: 0, pb: 6 }}>

            <Typography variant="h4" sx={{ color: theme.palette.text.primary, fontWeight: 'bold', mb: 4 }}>
                <SettingsIcon sx={{ mr: 1, fontSize: 36, verticalAlign: 'middle', color: accent }} />
                Settings
            </Typography>

            <Paper elevation={3} sx={{ p: 4, bgcolor: theme.palette.background.paper, border: `1px solid ${accent}50`, borderRadius: '16px' }}>

                {/* ── Appearance ──────────────────────────────────────────── */}
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2, color: accent, fontWeight: 'bold' }}>
                    <Palette sx={{ mr: 1, color: accent }} /> Appearance
                </Typography>

                <Box sx={{ p: 2, bgcolor: `${accent}05`, borderRadius: 2, borderLeft: `4px solid ${accent}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="subtitle2" fontWeight="bold">Dark Mode</Typography>
                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                                {theme.palette.mode === 'dark' ? 'Currently using dark theme' : 'Currently using light theme'}
                            </Typography>
                        </Box>
                        <Switch
                            checked={theme.palette.mode === 'dark'}
                            onChange={colorMode.toggleColorMode}
                            sx={switchSx}
                        />
                    </Box>
                </Box>

                <Divider sx={{ bgcolor: `${accent}20`, my: 3 }} />

                {/* ── Notifications ───────────────────────────────────────── */}
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2, color: accent, fontWeight: 'bold' }}>
                    <Notifications sx={{ mr: 1, color: accent }} /> Notifications
                </Typography>

                <Box sx={{ p: 2, bgcolor: `${accent}05`, borderRadius: 2, borderLeft: `4px solid ${accent}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="subtitle2" fontWeight="bold">Case Notifications</Typography>
                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                                Get notified when analysis completes or a message arrives
                            </Typography>
                        </Box>
                        <Switch
                            checked={notifications}
                            onChange={handleNotificationToggle}
                            sx={switchSx}
                        />
                    </Box>
                </Box>

                <Divider sx={{ bgcolor: `${accent}20`, my: 3 }} />

                {/* ── Security ────────────────────────────────────────────── */}
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1, color: accent, fontWeight: 'bold' }}>
                    <Lock sx={{ mr: 1, color: accent }} /> Security
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3, lineHeight: 1.8 }}>
                    Update your account password. Choose a strong password of at least 6 characters.
                </Typography>

                <Box sx={{ p: 2, bgcolor: `${accent}05`, borderRadius: 2, borderLeft: `4px solid ${accent}` }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
                        {[
                            { key: 'current', label: 'Current Password'     },
                            { key: 'next',    label: 'New Password'          },
                            { key: 'confirm', label: 'Confirm New Password'  },
                        ].map(({ key, label }) => (
                            <TextField
                                key={key}
                                label={label}
                                type={showPw[key] ? 'text' : 'password'}
                                value={pwForm[key]}
                                onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                                fullWidth size="small" sx={fieldSx}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setShowPw(s => ({ ...s, [key]: !s[key] }))}>
                                                {showPw[key] ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                        ))}

                        <Button
                            variant="contained"
                            onClick={handleChangePassword}
                            disabled={pwSaving}
                            startIcon={pwSaving ? <CircularProgress size={16} color="inherit" /> : <Lock />}
                            sx={{
                                alignSelf: 'flex-start',
                                bgcolor: accent,
                                fontWeight: 'bold',
                                textTransform: 'none',
                                borderRadius: '8px',
                                px: 3,
                                '&:hover': { bgcolor: accent + 'cc' },
                            }}
                        >
                            {pwSaving ? 'Saving…' : 'Update Password'}
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ mt: 4 }}>
                    <Typography variant="caption" sx={{ color: theme.palette.text.disabled }}>
                        MedVid AI · Version 1.0.4
                    </Typography>
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
