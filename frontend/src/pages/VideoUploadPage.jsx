import React, { useState, useRef, useEffect } from 'react';
import { MenuItem, useTheme } from '@mui/material';
import {
    Box, Typography, Button, Paper, LinearProgress, Alert, Snackbar,
    CircularProgress, Grid, TextField, ToggleButton, ToggleButtonGroup,
    Autocomplete, Fade
} from '@mui/material';
import {
    CloudUpload as CloudUploadIcon,
    Videocam as VideocamIcon,
    Person as PersonIcon,
    Search as SearchIcon,
    AddCircleOutline as AddIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getPatients, getVideoThumbnail } from '../services/api';
import api from '../services/api';

const RoundedTextField = ({ label, value, onChange, required, icon: Icon, accentColor, type = "text" }) => (
    <TextField
        label={label}
        fullWidth
        required={required}
        margin="normal"
        type={type}
        value={value}
        onChange={onChange}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
        InputProps={{
            startAdornment: Icon && (
                <Box sx={{ mr: 1, color: accentColor }}>
                    <Icon fontSize="small" />
                </Box>
            ),
        }}
    />
);

export default function UploadPage() {
    const theme        = useTheme();
    const navigate     = useNavigate();
    const fileInputRef = useRef(null);
    const videoRef     = useRef(null);
    const accentColor  = theme.palette.infoHighlight || theme.palette.primary.main;

    const [selectedFile,             setSelectedFile]             = useState(null);
    const [previewUrl,               setPreviewUrl]               = useState(null);
    const [uploadProgress,           setUploadProgress]           = useState(0);
    const [isUploading,              setIsUploading]              = useState(false);
    const [patientType,              setPatientType]              = useState('new');
    const [patientName,              setPatientName]              = useState('');
    const [patientAge,               setPatientAge]               = useState('');
    const [patientGender,            setPatientGender]            = useState('');
    const [selectedExistingPatient,  setSelectedExistingPatient]  = useState(null);
    const [existingPatients,         setExistingPatients]         = useState([]);
    const [patientsLoading,          setPatientsLoading]          = useState(false);
    const [snackbarOpen,             setSnackbarOpen]             = useState(false);
    const [snackbarMessage,          setSnackbarMessage]          = useState('');
    const [snackbarSeverity,         setSnackbarSeverity]         = useState('info');
    const [previewError,             setPreviewError]             = useState(false);
    const [thumbnailUrl,             setThumbnailUrl]             = useState(null);

    const showSnackbar = (message, severity = 'info') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    // Play video when a new file is selected
    useEffect(() => {
        if (videoRef.current && previewUrl) {
            videoRef.current.load();
            videoRef.current.play().catch(() => {});
        }
    }, [previewUrl]);

    // Fetch existing patients on mount
    useEffect(() => {
        const fetchPatients = async () => {
            setPatientsLoading(true);
            try {
                const patients = await getPatients();
                if (Array.isArray(patients) && patients.length > 0) {
                    setExistingPatients(patients.map(p => ({
                        name:   p.name,
                        id:     p._id,
                        age:    p.age    || '',
                        gender: p.gender || '',
                    })));
                }
            } catch (err) {
                console.error("Failed to load patients:", err);
            } finally {
                setPatientsLoading(false);
            }
        };
        fetchPatients();
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('video/')) {
            showSnackbar('Please select a valid video file.', 'error');
            return;
        }
        const url = URL.createObjectURL(file);
        setPreviewError(false);
        setThumbnailUrl(null);
        setSelectedFile(file);
        setPreviewUrl(url);

        // Fetch thumbnail in background — doesn't block anything
        getVideoThumbnail(file)
            .then(res => setThumbnailUrl(res.data.thumbnail))
            .catch(() => {});
    };

    const handleUploadAndAnalyze = async () => {
        if (!selectedFile) {
            showSnackbar('Please select a video file.', 'warning');
            return;
        }
        if (patientType === 'new' && (!patientName || !patientAge || !patientGender)) {
            showSnackbar('Please fill in all patient fields.', 'warning');
            return;
        }
        if (patientType === 'existing' && !selectedExistingPatient) {
            showSnackbar('Please select an existing patient.', 'warning');
            return;
        }

        setIsUploading(true);
        setUploadProgress(10);

        try {
            const formData = new FormData();
            formData.append('video', selectedFile);

            if (patientType === 'new') {
                formData.append('patientType', 'new');
                formData.append('name',        patientName);
                formData.append('age',         patientAge);
                formData.append('gender',      patientGender);
            } else {
                formData.append('patientType', 'existing');
                formData.append('patientId',   selectedExistingPatient.id);
            }

            setUploadProgress(30);

            const response = await api.post('/analysis/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (e) => {
                    const pct = Math.round((e.loaded / e.total) * 60) + 30;
                    setUploadProgress(Math.min(pct, 90));
                }
            });

            setUploadProgress(90);
            const data = response.data;

            if (response.status < 200 || response.status >= 300) {
                throw new Error(data.message || 'Upload failed');
            }

            setUploadProgress(100);
            showSnackbar('Analysis complete! Redirecting...', 'success');

            setTimeout(() => {
                navigate(`/results/${data.videoId}`);
            }, 1200);

        } catch (error) {
            console.error('Upload error:', error);
            showSnackbar(error.message || 'Upload failed. Please try again.', 'error');
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    return (
        <Box sx={{ p: 4, maxWidth: '1600px', margin: '0 auto' }}>
            <Typography variant="h4" fontWeight="bold" mb={4}>
                New Analysis: Upload & Prepare
            </Typography>

            <Grid container spacing={4}>

                {/* Patient Card */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={8} sx={{ p: 4, borderRadius: '24px', minHeight: '420px' }}>

                        <Box display="flex" alignItems="center" mb={2}>
                            <PersonIcon sx={{ color: accentColor, mr: 1 }} />
                            <Typography variant="h5" fontWeight="bold">Patient Data</Typography>
                        </Box>

                        <ToggleButtonGroup
                            value={patientType}
                            exclusive
                            fullWidth
                            onChange={(e, val) => val && setPatientType(val)}
                            sx={{ mb: 3 }}
                        >
                            <ToggleButton value="new">
                                <AddIcon sx={{ mr: 1 }} /> New Patient
                            </ToggleButton>
                            <ToggleButton value="existing">
                                <SearchIcon sx={{ mr: 1 }} /> Existing Patient
                            </ToggleButton>
                        </ToggleButtonGroup>

                        <Fade in={patientType === 'new'} timeout={300} unmountOnExit>
                            <Box>
                                <RoundedTextField label="Patient Full Name" value={patientName} onChange={(e) => setPatientName(e.target.value)} required icon={PersonIcon} accentColor={accentColor} />
                                <RoundedTextField label="Age" value={patientAge} onChange={(e) => setPatientAge(e.target.value)} required type="number" icon={PersonIcon} accentColor={accentColor} />
                                <TextField
                                    select label="Gender" fullWidth required margin="normal"
                                    value={patientGender} onChange={(e) => setPatientGender(e.target.value)}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                >
                                    <MenuItem value="Male">Male</MenuItem>
                                    <MenuItem value="Female">Female</MenuItem>
                                    <MenuItem value="Other">Other</MenuItem>
                                </TextField>
                            </Box>
                        </Fade>

                        <Fade in={patientType === 'existing'} timeout={300} unmountOnExit>
                            <Box>
                                <Autocomplete
                                    fullWidth
                                    options={existingPatients}
                                    loading={patientsLoading}
                                    getOptionLabel={(o) => `${o.name} (${o.id})`}
                                    onChange={(e, val) => {
                                        setSelectedExistingPatient(val);
                                        if (val) {
                                            setPatientAge(val.age?.toString() || '');
                                            setPatientGender(val.gender || '');
                                        }
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={
                                                patientsLoading ? "Loading patients..." :
                                                existingPatients.length === 0 ? "No patients found — add a new one first" :
                                                "Search Patient Database"
                                            }
                                            margin="normal"
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                        />
                                    )}
                                />
                                {selectedExistingPatient && (
                                    <Box sx={{ mt: 2, p: 2, borderRadius: '12px', bgcolor: accentColor + '15', border: `1px solid ${accentColor}40` }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Age: <strong>{selectedExistingPatient.age || 'N/A'}</strong>
                                            &nbsp;|&nbsp;
                                            Gender: <strong>{selectedExistingPatient.gender || 'N/A'}</strong>
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Fade>

                    </Paper>
                </Grid>

                {/* Upload Card */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={8} sx={{
                        p: 4, borderRadius: '24px', minHeight: '420px',
                        textAlign: 'center', border: `3px dashed ${accentColor}80`,
                        display: 'flex', flexDirection: 'column',
                        justifyContent: 'center', alignItems: 'center',
                    }}>
                        <CloudUploadIcon sx={{ fontSize: 80, color: accentColor, mb: 2 }} />
                        <Typography variant="h5" fontWeight="bold" mb={2}>Upload Diagnostic Video</Typography>

                        <Button
                            variant="contained" component="label"
                            startIcon={<VideocamIcon />} size="large"
                            sx={{ borderRadius: '12px', mb: 3, px: 6 }}
                        >
                            Browse Files
                            <input
                                hidden type="file" accept="video/*"
                                ref={fileInputRef} onChange={handleFileChange}
                            />
                        </Button>

                        {selectedFile && (
                            <Alert severity="success" sx={{ width: '80%', borderRadius: '12px' }}>
                                Ready: {selectedFile.name}
                            </Alert>
                        )}
                    </Paper>
                </Grid>

                {/* Preview & Action */}
                <Grid item xs={12}>
                    <Paper elevation={8} sx={{ p: 4, borderRadius: '24px' }}>
                        <Grid container spacing={4} alignItems="center">

                            {/* Video Preview */}
                            <Grid item xs={12} md={8}>
                                {previewUrl && !previewError ? (
                                    <video
                                        ref={videoRef}
                                        src={previewUrl}
                                        poster={thumbnailUrl || undefined}
                                        controls
                                        autoPlay
                                        muted
                                        width="100%"
                                        style={{ borderRadius: '12px', maxHeight: '500px', backgroundColor: '#000' }}
                                        onError={() => setPreviewError(true)}
                                    />
                                ) : previewUrl && previewError ? (
                                    thumbnailUrl ? (
                                        <Box sx={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
                                            <img
                                                src={thumbnailUrl}
                                                alt="Video thumbnail"
                                                style={{ width: '100%', maxHeight: '500px', objectFit: 'cover', borderRadius: '12px', display: 'block' }}
                                            />
                                            <Box sx={{
                                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                                bgcolor: 'rgba(0,0,0,0.6)', p: 1.5, borderRadius: '0 0 12px 12px'
                                            }}>
                                                <Typography variant="body2" color="white" textAlign="center">
                                                    {selectedFile?.name} — ready to analyze
                                                </Typography>
                                            </Box>
                                        </Box>
                                    ) : (
                                        <Box sx={{
                                            height: 250, display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', flexDirection: 'column',
                                            border: `1px dashed ${accentColor}80`, borderRadius: '12px',
                                            bgcolor: accentColor + '08', gap: 1
                                        }}>
                                            <VideocamIcon sx={{ fontSize: 48, color: accentColor }} />
                                            <Typography fontWeight="bold" color="text.primary">{selectedFile?.name}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Loading preview...
                                            </Typography>
                                        </Box>
                                    )
                                ) : (
                                    <Box sx={{
                                        height: 250, display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', border: '1px dashed #ccc',
                                        borderRadius: '12px'
                                    }}>
                                        <Typography color="text.secondary">
                                            Video preview will appear here
                                        </Typography>
                                    </Box>
                                )}
                            </Grid>

                            {/* Progress & Button */}
                            <Grid item xs={12} md={4}>
                                {isUploading && (
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="h6" mb={1} color={accentColor}>
                                            Analyzing: {uploadProgress}%
                                        </Typography>
                                        <LinearProgress
                                            value={uploadProgress}
                                            variant="determinate"
                                            sx={{ height: 10, borderRadius: 5 }}
                                        />
                                    </Box>
                                )}
                                <Button
                                    fullWidth size="large" variant="contained" color="secondary"
                                    startIcon={isUploading ? <CircularProgress size={24} color="inherit" /> : <VideocamIcon />}
                                    disabled={isUploading || !selectedFile}
                                    onClick={handleUploadAndAnalyze}
                                    sx={{ borderRadius: '16px', py: 3, fontSize: '1.1rem', fontWeight: 'bold' }}
                                >
                                    {isUploading ? 'AI PROCESSING...' : 'RUN MEDVID AI ANALYSIS'}
                                </Button>
                            </Grid>

                        </Grid>
                    </Paper>
                </Grid>

            </Grid>

            <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)}>
                <Alert severity={snackbarSeverity} variant="filled">{snackbarMessage}</Alert>
            </Snackbar>
        </Box>
    );
}