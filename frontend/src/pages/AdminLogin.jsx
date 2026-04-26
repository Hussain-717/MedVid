import React, { useState } from 'react';
import {
    Box, TextField, Button, Typography, Alert, InputAdornment, IconButton,
    useTheme,
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Security, VpnKey, Visibility, VisibilityOff, AdminPanelSettings, ArrowBack } from '@mui/icons-material';

const ADMIN_EMAIL    = 'admin@medvid.com';
const ADMIN_PASSWORD = 'kajshqwnjbghjgasjcnb22788916@securesecure1230';

export default function AdminLogin() {
    const theme   = useTheme();
    const isDark  = theme.palette.mode === 'dark';
    const nav     = useNavigate();

    const [form,    setForm]    = useState({ email: '', password: '' });
    const [error,   setError]   = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    const change = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const submit = (e) => {
        e.preventDefault();
        setError(null);

        if (!form.email || !form.password) {
            setError('Please enter both email and password.');
            return;
        }

        setLoading(true);
        setTimeout(() => {
            if (form.email === ADMIN_EMAIL && form.password === ADMIN_PASSWORD) {
                localStorage.setItem('medvid_admin_token', 'hardcoded-admin-token-123');
                localStorage.setItem('medvid_admin_user', JSON.stringify({
                    id: 'admin_id_001', name: 'System Admin',
                    email: ADMIN_EMAIL, role: 'Admin',
                }));
                setLoading(false);
                nav('/admin/dashboard');
            } else {
                setLoading(false);
                setError('Invalid admin credentials.');
            }
        }, 800);
    };

    const CORAL      = '#FF7F50';
    const CORAL_DARK = '#e8623a';
    const pageBg     = isDark
        ? 'linear-gradient(160deg, #0d1b2a 0%, #1a1a1a 100%)'
        : 'linear-gradient(160deg, #fff5f0 0%, #fef6f0 100%)';

    return (
        <Box sx={{
            minHeight: '100vh',
            background: pageBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 2,
        }}>
            <Box sx={{
                width: '100%',
                maxWidth: 420,
                bgcolor: 'background.paper',
                borderRadius: 4,
                border: `1px solid ${CORAL}44`,
                boxShadow: `0 0 40px ${CORAL}22`,
                p: { xs: 4, sm: 5 },
            }}>
                {/* Icon + Title */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Box sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 64, height: 64,
                        borderRadius: '50%',
                        bgcolor: `${CORAL}18`,
                        border: `2px solid ${CORAL}55`,
                        mb: 2,
                    }}>
                        <AdminPanelSettings sx={{ fontSize: 32, color: CORAL }} />
                    </Box>
                    <Typography variant="h5" fontWeight={800} sx={{ color: CORAL }}>
                        Admin Panel
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Restricted access — authorised personnel only
                    </Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box component="form" onSubmit={submit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <TextField
                        label="Admin Email"
                        type="email"
                        value={form.email}
                        onChange={change('email')}
                        required
                        fullWidth
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Security sx={{ color: CORAL, fontSize: 18 }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            '& label.Mui-focused':                 { color: CORAL },
                            '& .MuiOutlinedInput-root': {
                                '&:hover fieldset':                { borderColor: CORAL },
                                '&.Mui-focused fieldset':          { borderColor: CORAL },
                            },
                        }}
                    />

                    <TextField
                        label="Password"
                        type={showPwd ? 'text' : 'password'}
                        value={form.password}
                        onChange={change('password')}
                        required
                        fullWidth
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <VpnKey sx={{ color: CORAL, fontSize: 18 }} />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowPwd(p => !p)} edge="end" size="small">
                                        {showPwd
                                            ? <VisibilityOff sx={{ fontSize: 18 }} />
                                            : <Visibility    sx={{ fontSize: 18 }} />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            '& label.Mui-focused':        { color: CORAL },
                            '& .MuiOutlinedInput-root': {
                                '&:hover fieldset':       { borderColor: CORAL },
                                '&.Mui-focused fieldset': { borderColor: CORAL },
                            },
                        }}
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                        fullWidth
                        size="large"
                        sx={{
                            mt: 1,
                            py: 1.4,
                            fontWeight: 700,
                            borderRadius: 2,
                            bgcolor: CORAL,
                            color: '#fff',
                            '&:hover': { bgcolor: CORAL_DARK },
                            '&:disabled': { bgcolor: `${CORAL}88` },
                        }}>
                        {loading ? 'Verifying...' : 'Login as Admin'}
                    </Button>
                </Box>

                <Typography variant="caption" color="text.secondary"
                    sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
                    This area is monitored and all access is logged.
                </Typography>

                <Button
                    component={RouterLink} to="/"
                    startIcon={<ArrowBack />}
                    fullWidth
                    sx={{ mt: 2, color: 'text.secondary', '&:hover': { bgcolor: 'action.hover' } }}>
                    Back to Home
                </Button>
            </Box>
        </Box>
    );
}