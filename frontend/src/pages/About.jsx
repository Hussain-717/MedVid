import React, { useState, useEffect } from 'react';
import { Box, CssBaseline, Container, Typography, Paper, Divider, Grid, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Info, Psychology, Layers, VerifiedUser } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import Sidebar from '../components/Sidebar'; // Adjust the path based on your folder structure

// --- Main Content Component ---
const AboutContent = ({ theme, isConsultant }) => {
    const roleAccentColor = isConsultant ? "#FF7F50" : theme.palette.infoHighlight;

    return (
        <Container maxWidth="lg" sx={{ pt: 0, pb: 6 }}> {/* Changed pt: 4 to pt: 0 */}
            <Typography variant="h4" sx={{ color: theme.palette.text.primary, fontWeight: 'bold', mb: 4 }}>
                <Info sx={{ mr: 1, fontSize: 36, verticalAlign: 'middle', color: roleAccentColor }} /> 
                About MedVid-AI
            </Typography>

            <Paper elevation={3} sx={{ p: 4, bgcolor: theme.palette.background.paper, border: `1px solid ${roleAccentColor}50`, borderRadius: '16px' }}>
                <Typography variant="h5" gutterBottom sx={{ color: roleAccentColor, fontWeight: 'bold' }}>
                    {isConsultant ? "Expert Validation System for GI Endoscopy" : "AI-Powered Video Diagnosis for Endoscopy"}
                </Typography>
                
                <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 3, lineHeight: 1.8 }}>
                    MedVid-AI uses the <strong>VidFormer</strong> architecture to analyze endoscopy videos. It captures the temporal context of the procedure to identify polyps and lesions with high clinical accuracy.
                </Typography>

                <Divider sx={{ bgcolor: `${roleAccentColor}20`, my: 3 }} />

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Psychology sx={{ mr: 1, color: roleAccentColor }} /> Research Focus
                        </Typography>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                            Focused on reducing false negatives in GI tract screenings through long-video sequence modeling.
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Layers sx={{ mr: 1, color: roleAccentColor }} /> Dataset
                        </Typography>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                            Trained and validated on the Hyper-Kvasir and Kvasir-Capsule multi-class medical datasets.
                        </Typography>
                    </Grid>
                </Grid>

                <Box sx={{ mt: 3, p: 2, bgcolor: `${roleAccentColor}05`, borderRadius: 2, borderLeft: `4px solid ${roleAccentColor}` }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Platform Capabilities:</Typography>
                    <List dense>
                        <ListItem>
                            <ListItemIcon><VerifiedUser sx={{ color: roleAccentColor, fontSize: 20 }} /></ListItemIcon>
                            <ListItemText primary="Automated Temporal Lesion Detection" />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon><VerifiedUser sx={{ color: roleAccentColor, fontSize: 20 }} /></ListItemIcon>
                            <ListItemText primary="Real-time Expert Consultation Bridge" />
                        </ListItem>
                    </List>
                </Box>
            </Paper>
        </Container>
    );
};

// --- Page Shell ---
export default function About() {
    const theme = useTheme();
    const [user, setUser] = useState({ role: 'Doctor' });

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("medvid_user") || "{}");
        if (storedUser.role) setUser(storedUser);
    }, []);

    const isConsultant = user.role === 'Consultant';

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <Sidebar />

            <Box 
                component="main" 
                sx={{ 
                    flexGrow: 1, 
                    p: 3, 
                    // Change mt: 8 to mt: 6 or mt: 7 if you want it even tighter
                    mt: 7, 
                    minHeight: '100vh',
                    bgcolor: theme.palette.background.default 
                }}
            >
                <AboutContent theme={theme} isConsultant={isConsultant} />
            </Box>
        </Box>
    );
}