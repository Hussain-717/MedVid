import React, { useState } from 'react';
import { 
    Box, Typography, Container, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Chip, Button, IconButton, 
    TextField, InputAdornment, useTheme, alpha, Tooltip, Stack,
    Divider // <--- ADD THIS LINE
} from '@mui/material';
import { 
    Search, FilterList, Download, History, 
    Security, Info, Warning, Error, Launch,
    CalendarMonth, FiberManualRecord
} from '@mui/icons-material';
import Sidebar from '../components/Sidebar';

const MOCK_LOGS = [
    { id: 'LOG-1024', timestamp: '2025-12-18 14:30:02', user: 'Dr. Arshad', action: 'Confirmed AI Finding', resource: 'CASE-942', severity: 'Info', ip: '192.168.1.45' },
    { id: 'LOG-1023', timestamp: '2025-12-18 14:15:22', user: 'Dr. Sarah', action: 'Rejected AI Finding', resource: 'CASE-938', severity: 'Warning', ip: '192.168.1.12' },
    { id: 'LOG-1022', timestamp: '2025-12-18 13:45:10', user: 'System AI', action: 'New Analysis Generated', resource: 'CASE-945', severity: 'Info', ip: 'Local' },
    { id: 'LOG-1021', timestamp: '2025-12-18 12:00:00', user: 'Admin', action: 'Data Export Initiated', resource: 'All_Urgent_Cases', severity: 'Critical', ip: '192.168.1.02' },
    { id: 'LOG-1020', timestamp: '2025-12-18 11:30:45', user: 'Dr. Kevin', action: 'User Login', resource: 'Portal', severity: 'Info', ip: '104.22.11.5' },
];

export default function AuditLogs() {
    const theme = useTheme();
    const accentColor = '#FF7F50';
    const [searchTerm, setSearchTerm] = useState("");

    const getSeverityChip = (severity) => {
        const styles = {
            Critical: { color: theme.palette.error.main, bg: alpha(theme.palette.error.main, 0.1), icon: <Error fontSize="inherit" /> },
            Warning: { color: theme.palette.warning.main, bg: alpha(theme.palette.warning.main, 0.1), icon: <Warning fontSize="inherit" /> },
            Info: { color: theme.palette.info.main, bg: alpha(theme.palette.info.main, 0.1), icon: <Info fontSize="inherit" /> }
        };
        const style = styles[severity] || styles.Info;
        return (
            <Chip 
                icon={style.icon}
                label={severity} 
                size="small"
                sx={{ fontWeight: 'bold', color: style.color, bgcolor: style.bg, borderRadius: '4px' }} 
            />
        );
    };

    return (
        <Box sx={{ display: 'flex', bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
            <Sidebar />
            
            <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, mt: 8 }}>
                <Container maxWidth="xl">
                    
                    {/* Header */}
                    <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="h4" sx={{ fontWeight: 800 }}>System Audit Logs</Typography>
                                <Chip 
                                    label="LIVE" 
                                    size="small" 
                                    icon={<FiberManualRecord sx={{ fontSize: '10px !important', color: '#4caf50' }} />}
                                    sx={{ bgcolor: alpha('#4caf50', 0.1), color: '#4caf50', fontWeight: 'bold', height: 20 }}
                                />
                            </Stack>
                            <Typography variant="body1" color="text.secondary">Comprehensive trail of all user and system activities</Typography>
                        </Box>
                        <Button 
                            variant="outlined" 
                            startIcon={<Download />}
                            sx={{ borderColor: accentColor, color: accentColor, borderRadius: '8px', fontWeight: 'bold', '&:hover': { borderColor: accentColor, bgcolor: alpha(accentColor, 0.05) } }}
                        >
                            Export CSV
                        </Button>
                    </Box>

                    {/* Filter Bar with Date Range */}
                    <Paper 
                        elevation={0}
                        sx={{ 
                            p: 2, mb: 3, borderRadius: '12px', display: 'flex', gap: 2, alignItems: 'center',
                            bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`
                        }}
                    >
                        <TextField 
                            size="small" 
                            variant="outlined" 
                            placeholder="Search User, Case ID, or IP..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search sx={{ color: accentColor }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ width: 350 }}
                        />

                        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                        <Button 
                            startIcon={<CalendarMonth />} 
                            endIcon={<FilterList fontSize="small" />}
                            sx={{ color: theme.palette.text.primary, fontWeight: 600 }}
                        >
                            Dec 01, 2025 - Dec 18, 2025
                        </Button>

                        <Box sx={{ flexGrow: 1 }} />
                        
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <History sx={{ fontSize: 14 }} /> Retention: 90 Days
                        </Typography>
                    </Paper>

                    {/* Logs Table */}
                    <TableContainer 
                        component={Paper} 
                        elevation={0}
                        sx={{ 
                            borderRadius: '16px', border: `1px solid ${theme.palette.divider}`,
                            backgroundImage: 'none', bgcolor: theme.palette.background.paper
                        }}
                    >
                        <Table>
                            <TableHead sx={{ bgcolor: alpha(accentColor, 0.05) }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Timestamp</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Actor</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Action</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Resource</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Severity</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Details</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {MOCK_LOGS.map((log) => (
                                    <TableRow key={log.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.85rem', fontFamily: 'monospace', color: theme.palette.text.secondary }}>
                                            {log.timestamp}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{log.user}</Typography>
                                            <Typography variant="caption" color="text.secondary">{log.ip}</Typography>
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>{log.action}</TableCell>
                                        <TableCell>
                                            <Chip label={log.resource} size="small" variant="outlined" sx={{ borderRadius: '4px', fontSize: '0.75rem' }} />
                                        </TableCell>
                                        <TableCell>{getSeverityChip(log.severity)}</TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" sx={{ color: accentColor, bgcolor: alpha(accentColor, 0.05), '&:hover': { bgcolor: accentColor, color: '#fff' } }}>
                                                <Launch fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Container>
            </Box>
        </Box>
    );
}