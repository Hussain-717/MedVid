import React, { useState } from "react";
import {
  Container, TextField, Button, Typography, Paper, Alert, Box,
  FormControlLabel, Checkbox, Tabs, Tab, Fade, CircularProgress,
} from "@mui/material";
import { useNavigate, Link } from "react-router-dom";
import { Science, VpnKey, Person, BusinessCenter } from "@mui/icons-material";
import { loginUser } from "../services/api";

const LoginForm = ({ loginType, form, change, submit, loading, error, inputStyle, isConsultant = false }) => {
  const accentColor = isConsultant ? '#FF7F50' : '#64FFDA';
  const accentHoverColor = isConsultant ? '#FF926B' : '#98FFDF';

  return (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); submit(isConsultant); }} sx={{ display: "grid", gap: 2.5, pt: 2 }}>
      {error && (
        <Fade in={!!error}>
          <Alert severity="error" sx={{
            borderRadius: '12px',
            bgcolor: 'rgba(255, 77, 79, 0.1)',
            color: '#ff4d4f',
            border: '1px solid rgba(255, 77, 79, 0.3)'
          }}>
            {error}
          </Alert>
        </Fade>
      )}

      <TextField label="Email" value={form.email} onChange={change("email")} required type="email" {...inputStyle} />
      <TextField label="Password" value={form.password} onChange={change("password")} type="password" required {...inputStyle} />

      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <FormControlLabel
          control={<Checkbox checked={form.remember} onChange={change("remember")}
          sx={{ color: `${accentColor}4D`, '&.Mui-checked': { color: accentColor } }} />}
          label={<Typography variant="body2" sx={{ color: '#A8B1B8' }}>Keep me logged in</Typography>}
        />
      </Box>

      <Button
        type="submit" variant="contained" disabled={loading}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : (isConsultant ? <BusinessCenter /> : <Science />)}
        sx={{
          mt: 1, bgcolor: accentColor, color: '#0A1929', fontWeight: 800, fontSize: '1rem',
          borderRadius: '12px', textTransform: 'none', py: 1.8,
          boxShadow: `0 8px 20px ${accentColor}33`,
          transition: 'all 0.3s ease',
          '&:hover': {
            bgcolor: accentHoverColor, transform: 'translateY(-2px)',
            boxShadow: `0 12px 25px ${accentColor}66`
          },
          '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }
        }}
      >
        {loading ? "Verifying..." : `Login as ${loginType}`}
      </Button>

      <Typography variant="body2" align="center" sx={{ mt: 1, color: '#A8B1B8' }}>
        New to MedViD?
        <Link to="/signup" style={{ color: accentColor, textDecoration: 'none', fontWeight: 'bold', marginLeft: '6px' }}>
          Create Account
        </Link>
      </Typography>
    </Box>
  );
}

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState('User');
  const navigate = useNavigate();

  const change = (k) => (e) => {
    const val = k === "remember" ? e.target.checked : e.target.value;
    setForm({ ...form, [k]: val });
  };

  const handleTabChange = (event, newValue) => {
    setLoginType(newValue);
    setForm({ email: "", password: "", remember: false });
    setError(null);
  };

  const submit = async (isConsultant = false) => {
    setError(null);
    if (!form.email || !form.password) { setError("Enter email and password."); return; }
    setLoading(true);

    try {
      const { data } = await loginUser({
        email: form.email,
        password: form.password
      });

      const user = data.user;
      const userRole = user.role;

      if (isConsultant && userRole !== 'Consultant') {
        throw new Error("Please use the User Login tab.");
      }
      if (!isConsultant && userRole === 'Consultant') {
        throw new Error("Please use the Consultant Login tab.");
      }

      const token = data.token;
      localStorage.setItem("medvid_token", token);
      localStorage.setItem("medvid_user", JSON.stringify(user));

      if (userRole === 'Consultant') {
        localStorage.setItem("medvid_admin_token", token);
        navigate('/consDashboard');
      } else {
        navigate('/dashboard');
      }

    } catch (err) {
      const message = err.response?.data?.message || err.message;
      setError(!err.response ? "Connection Error: Server Unreachable" : message);
    } finally {
      setLoading(false);
    }
  };

  const activeColor = loginType === 'Consultant' ? '#FF7F50' : '#64FFDA';
  const inputStyle = {
    InputLabelProps: { style: { color: `${activeColor}B3` } },
    InputProps: { style: { color: 'white', borderRadius: '12px' } },
    sx: {
      '& .MuiOutlinedInput-root': {
        backgroundColor: 'rgba(10, 25, 41, 0.5)',
        '& fieldset': { borderColor: `${activeColor}33`, borderRadius: '12px' },
        '&:hover fieldset': { borderColor: `${activeColor}80` },
        '&.Mui-focused fieldset': { borderColor: activeColor },
      }
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      background: 'radial-gradient(circle at 50% 50%, #102a43 0%, #05101a 100%)',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        width: '300px', height: '300px',
        background: loginType === 'Consultant' ? '#FF7F50' : '#64FFDA',
        filter: 'blur(150px)',
        opacity: 0.1,
        top: '10%', left: '10%',
      }
    }}>
      <Container maxWidth="sm">
        <Fade in timeout={1000}>
          <Paper elevation={0} sx={{
            p: { xs: 4, sm: 6 },
            borderRadius: '28px',
            bgcolor: 'rgba(30, 42, 56, 0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: `0 20px 50px rgba(0,0,0,0.5)`,
            width: '100%',
          }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box sx={{
                display: 'inline-flex', p: 2, borderRadius: '20px',
                bgcolor: 'rgba(100, 255, 218, 0.1)', mb: 2
              }}>
                <VpnKey sx={{ fontSize: 40, color: loginType === 'Consultant' ? '#FF7F50' : '#64FFDA' }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>
                MedViD
              </Typography>
              <Typography variant="body1" sx={{ color: '#A8B1B8', mt: 1 }}>
                Intelligence in Motion
              </Typography>
            </Box>

            <Tabs value={loginType} onChange={handleTabChange} centered sx={{
              mb: 4,
              '& .MuiTabs-indicator': { height: '3px', borderRadius: '3px', bgcolor: loginType === 'Consultant' ? '#FF7F50' : '#64FFDA' }
            }}>
              <Tab value="User" label="Patient/User" icon={<Person />} sx={{ color: 'white', fontWeight: 700, opacity: 0.6, '&.Mui-selected': { opacity: 1, color: '#64FFDA' } }} />
              <Tab value="Consultant" label="Consultant" icon={<BusinessCenter />} sx={{ color: 'white', fontWeight: 700, opacity: 0.6, '&.Mui-selected': { opacity: 1, color: '#FF7F50' } }} />
            </Tabs>

            {loginType === 'User' && (
              <LoginForm loginType="User" form={form} change={change} submit={submit} loading={loading} error={error} inputStyle={inputStyle} isConsultant={false} />
            )}
            {loginType === 'Consultant' && (
              <LoginForm loginType="Consultant" form={form} change={change} submit={submit} loading={loading} error={error} inputStyle={inputStyle} isConsultant={true} />
            )}

            <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: 'rgba(168, 177, 184, 0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Secure Biometric Access Enabled
              </Typography>
              <Box sx={{ mt: 1.5 }}>
                <Link to="/" style={{ color: 'rgba(168, 177, 184, 0.6)', textDecoration: 'none', fontSize: '0.8rem' }}>
                  ← Back to Home
                </Link>
              </Box>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
}