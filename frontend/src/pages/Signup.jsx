import React, { useState } from "react";
import {
  Container,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  Fade,
  CircularProgress
} from "@mui/material";
import { useNavigate, Link } from "react-router-dom";
import { PersonAddAlt1, HowToReg } from "@mui/icons-material";
import { signupUser } from "../services/api";

const ROLES = [
  { value: "Doctor", label: "Doctor" },
  { value: "Consultant", label: "Consultant" },
];

export default function Signup() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    role: "",
    affiliation: "",
    designation: "",
    phone: "",
    purpose: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const change = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    if (!form.name || !form.email || !form.password || !form.confirm || !form.role) {
      return "Please fill all required fields.";
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Enter a valid email address.";
    if (form.password.length < 6) return "Password must be at least 6 characters.";
    if (form.password !== form.confirm) return "Passwords do not match.";

    if (needsAffiliation && !form.affiliation) {
      return "Please provide the affiliation (hospital/clinic, institute, or firm name).";
    }

    if ((isDoctor || isConsultant) && !form.designation) {
      return `Please provide your designation as a ${form.role}.`;
    }

    return null;
  };

  const submit = async () => {
    setError(null);
    setSuccess(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);

    try {
      const { confirm, ...payload } = form;

      // ✅ Using api.js instead of direct fetch
      const { data } = await signupUser(payload);

      setSuccess(data.message || "Registration successful!");
      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (err) {
      // Axios errors come in err.response
      const message = err.response?.data?.message || err.message;

      let clientError = message;
      if (!err.response) {
        clientError = "Connection Error: Cannot reach the backend server. Is the Node server running?";
      }

      setError(clientError || "Signup failed. Please check the server status and try again.");
    } finally {
      setLoading(false);
    }
  };

  const isDoctor = form.role === "Doctor";
  const isConsultant = form.role === "Consultant";
  const needsAffiliation = ["Doctor", "Hospital", "Institute", "Consultant"].includes(form.role);

  const accentColor = isConsultant ? '#FF7F50' : '#64FFDA';

  const inputStyle = {
    InputLabelProps: { style: { color: 'rgba(100, 255, 218, 0.7)' } },
    InputProps: { style: { color: 'white', borderRadius: '12px' } },
    sx: {
      '& .MuiOutlinedInput-root': {
        backgroundColor: 'rgba(10, 25, 41, 0.5)',
        '& fieldset': { borderColor: 'rgba(100, 255, 218, 0.2)', transition: 'border-color 0.3s', borderRadius: '12px' },
        '&:hover fieldset': { borderColor: 'rgba(100, 255, 218, 0.5)' },
        '&.Mui-focused fieldset': { borderColor: accentColor, borderWidth: '2px' },
      },
      '& .MuiFormHelperText-root': { color: '#A8B1B8' }
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      py: 6,
      background: 'radial-gradient(circle at 50% 50%, #102a43 0%, #05101a 100%)',
    }}>
      <Container maxWidth="sm">
        <Fade in timeout={800}>
          <Paper
            elevation={12}
            sx={{
              p: { xs: 3, sm: 5 },
              borderRadius: '28px',
              bgcolor: 'rgba(30, 42, 56, 0.6)',
              backdropFilter: 'blur(12px)',
              width: '100%',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: '0 0 20px rgba(100, 255, 218, 0.2)'
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <HowToReg sx={{ fontSize: 45, color: accentColor, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 900, color: 'white', textShadow: `0 0 10px ${accentColor}40` }}>
                MedViD Sign Up
              </Typography>
              <Typography variant="body2" color="#A8B1B8" sx={{ mt: 1 }}>
                Create an account and access AI-powered diagnostic tools.
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px', bgcolor: 'rgba(255, 77, 79, 0.1)', color: '#ff4d4f' }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2, borderRadius: '12px', bgcolor: 'rgba(100, 255, 218, 0.1)', color: '#64FFDA' }}>{success}</Alert>}

            <Box component="form" onSubmit={(e) => { e.preventDefault(); submit(); }} sx={{ display: "grid", gap: 2.5 }}>
              <TextField label="Full name" value={form.name} onChange={change("name")} required {...inputStyle} />
              <TextField label="Email" value={form.email} onChange={change("email")} required type="email" {...inputStyle} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField label="Password" value={form.password} onChange={change("password")} required type="password" fullWidth {...inputStyle} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Confirm password" value={form.confirm} onChange={change("confirm")} required type="password" fullWidth {...inputStyle} />
                </Grid>
              </Grid>

              <FormControl fullWidth sx={{ ...inputStyle.sx }}>
                <InputLabel id="role-label" sx={{ color: 'rgba(100, 255, 218, 0.7)' }}>Role</InputLabel>
                <Select
                  labelId="role-label"
                  value={form.role}
                  label="Role"
                  onChange={change("role")}
                  required
                  sx={{ color: 'white', borderRadius: '12px' }}
                >
                  {ROLES.map((r) => (
                    <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {needsAffiliation && (
                <TextField
                  label={
                    form.role === "Hospital" ? "Hospital / Clinic name" :
                    form.role === "Institute" ? "Institute / Lab name" :
                    form.role === "Consultant" ? "Consulting Firm / Affiliation" :
                    "Affiliation (e.g., hospital or university)"
                  }
                  value={form.affiliation}
                  onChange={change("affiliation")}
                  required
                  {...inputStyle}
                />
              )}

              {(isDoctor || isConsultant) && (
                <TextField
                  label={isDoctor ? "Designation (e.g. Gastroenterologist)" : "Designation (e.g. Senior Consultant)"}
                  value={form.designation}
                  onChange={change("designation")}
                  required
                  {...inputStyle}
                />
              )}

              <TextField label="Phone (optional)" value={form.phone} onChange={change("phone")} {...inputStyle} />

              <TextField
                label="Purpose (optional)"
                value={form.purpose}
                onChange={change("purpose")}
                helperText="e.g. research, clinical review"
                multiline
                minRows={2}
                {...inputStyle}
              />

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAddAlt1 />}
                sx={{
                  mt: 2,
                  bgcolor: accentColor,
                  color: '#0A1929',
                  fontWeight: 800,
                  py: 1.8,
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontSize: '1rem',
                  boxShadow: `0 8px 20px ${accentColor}33`,
                  '&:hover': {
                    bgcolor: isConsultant ? '#FF926B' : '#98FFDF',
                    transform: 'translateY(-2px)',
                    boxShadow: `0 12px 25px ${accentColor}66`
                  },
                }}
              >
                {loading ? "Signing up..." : "Sign up"}
              </Button>

              <Typography variant="body2" align="center" sx={{ mt: 1, color: '#A8B1B8' }}>
                Already have an account?
                <Link to="/login" style={{ color: accentColor, textDecoration: 'none', fontWeight: 'bold', marginLeft: '6px' }}>
                  Login
                </Link>
              </Typography>

              <Typography variant="body2" align="center" sx={{ mt: 1.5 }}>
                <Link to="/" style={{ color: 'rgba(168, 177, 184, 0.6)', textDecoration: 'none', fontSize: '0.8rem' }}>
                  ← Back to Home
                </Link>
              </Typography>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
}