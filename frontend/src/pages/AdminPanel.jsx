import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Container, Grid, Card, CardContent,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, IconButton, TextField, InputAdornment, Tab, Tabs,
    Avatar, Skeleton, Alert, Dialog, DialogTitle, DialogContent,
    DialogActions, useTheme, Tooltip, Badge, Snackbar, TablePagination,
} from '@mui/material';
import {
    AdminPanelSettings, Logout, Group, VideoLibrary, MedicalServices,
    PersonSearch, Delete, Search, Refresh, CheckCircle, Cancel,
    Assignment, Person, HourglassEmpty, Block, LockOpen, Visibility, PersonOff, Download,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend,
    CategoryScale, LinearScale, BarElement, Title as ChartTitle,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, ChartTitle);

const ADMIN_TOKEN = 'hardcoded-admin-token-123';

const adminApi = axios.create({ baseURL: 'http://localhost:5000/api' });
adminApi.interceptors.request.use((cfg) => {
    cfg.headers.Authorization = `Bearer ${ADMIN_TOKEN}`;
    return cfg;
});

const ROLE_COLOR = {
    Doctor:     'primary',
    Consultant: 'warning',
    Hospital:   'success',
    Institute:  'secondary',
};

const ACTION_COLOR = {
    LOGIN:            '#3AB0A9',
    UPLOAD:           '#AED6F1',
    ANALYZE:          '#7BD9A0',
    GENERATE_REPORT:  '#FFC857',
    EXPORT_REPORT:    '#FFC857',
    DELETE_USER:      '#FF6B6B',
    APPROVE_USER:     '#7BD9A0',
    REJECT_USER:      '#FF6B6B',
    DEACTIVATE_USER:  '#FFC857',
    REACTIVATE_USER:  '#7BD9A0',
    VERIFY:           '#7BD9A0',
    REJECT:           '#FF6B6B',
};

const TABLE_HEAD = { fontWeight: 700, py: 1.5 };
const LAST_ROW   = { '&:last-child td': { border: 0 } };

function StatCard({ icon, label, value, accent, loading }) {
    return (
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
                <Avatar sx={{ bgcolor: `${accent}20`, color: accent, width: 52, height: 52 }}>
                    {icon}
                </Avatar>
                <Box>
                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                    {loading
                        ? <Skeleton width={60} height={36} />
                        : <Typography variant="h4" fontWeight={800} sx={{ color: accent }}>{value ?? '—'}</Typography>
                    }
                </Box>
            </CardContent>
        </Card>
    );
}

function EmptyRow({ colSpan, icon, text }) {
    return (
        <TableRow>
            <TableCell colSpan={colSpan} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                <Box sx={{ opacity: 0.35, mb: 1 }}>{icon}</Box>
                {text}
            </TableCell>
        </TableRow>
    );
}

function SkeletonRows({ cols, rows = 5 }) {
    return Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
            {Array.from({ length: cols }).map((_, j) => (
                <TableCell key={j}><Skeleton /></TableCell>
            ))}
        </TableRow>
    ));
}

export default function AdminPanel() {
    const theme  = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const nav    = useNavigate();

    const adminUser = JSON.parse(localStorage.getItem('medvid_admin_user') || '{}');
    const CORAL     = '#FF7F50';
    const accent    = isDark ? '#AED6F1' : '#3AB0A9';
    const headSx    = { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' };

    // ── State ────────────────────────────────────────────────────────────
    const [tab,          setTab]         = useState(0);
    const [stats,        setStats]       = useState(null);
    const [users,        setUsers]       = useState([]);       // approved + inactive
    const [pendingUsers,  setPending]      = useState([]);
    const [rejectedUsers, setRejected]    = useState([]);
    const [logs,          setLogs]        = useState([]);
    const [search,        setSearch]      = useState('');
    const [roleFilter,    setRoleFilter]  = useState('All');
    const [loadStats,     setLoadStats]   = useState(true);
    const [loadUsers,     setLoadUsers]   = useState(true);
    const [loadPending,   setLoadPending] = useState(true);
    const [loadRejected,  setLoadRejected]= useState(true);
    const [loadLogs,      setLoadLogs]    = useState(true);
    const [chartData,     setChartData]   = useState(null);
    const [error,        setError]       = useState(null);
    const [success,      setSuccess]     = useState(null);

    // Delete dialog (All Users tab)
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting,     setDeleting]     = useState(false);

    // Toggle dialog (deactivate / reactivate — All Users tab)
    const [toggleTarget, setToggleTarget] = useState(null); // { user, action: 'deactivate'|'reactivate' }
    const [toggling,     setToggling]     = useState(false);

    // Pending dialog (approve / reject — Pending tab)
    const [pendingTarget, setPendingTarget] = useState(null);
    const [pendingAction, setPendingAction] = useState(false);

    // Re-approve dialog (Rejected tab)
    const [reApproveTarget, setReApproveTarget] = useState(null);
    const [reApproving,     setReApproving]     = useState(false);

    // Pagination
    const [usersPage,        setUsersPage]        = useState(0);
    const [usersRowsPerPage, setUsersRowsPerPage] = useState(10);
    const [logsPage,         setLogsPage]         = useState(0);
    const [logsRowsPerPage,  setLogsRowsPerPage]  = useState(10);

    // View/Edit dialog
    const [editTarget, setEditTarget]   = useState(null);
    const [editForm,   setEditForm]     = useState({});
    const [saving,     setSaving]       = useState(false);

    // ── Fetch helpers ────────────────────────────────────────────────────
    const fetchStats = useCallback(async () => {
        setLoadStats(true);
        try   { const { data } = await adminApi.get('/admin/stats');   setStats(data); }
        catch { setError('Failed to load stats.'); }
        finally { setLoadStats(false); }
    }, []);

    const fetchUsers = useCallback(async () => {
        setLoadUsers(true);
        try   { const { data } = await adminApi.get('/admin/users');   setUsers(data.users || []); }
        catch { setError('Failed to load users.'); }
        finally { setLoadUsers(false); }
    }, []);

    const fetchPending = useCallback(async () => {
        setLoadPending(true);
        try   { const { data } = await adminApi.get('/admin/pending');  setPending(data.users || []); }
        catch { setError('Failed to load pending requests.'); }
        finally { setLoadPending(false); }
    }, []);

    const fetchRejected = useCallback(async () => {
        setLoadRejected(true);
        try   { const { data } = await adminApi.get('/admin/rejected'); setRejected(data.users || []); }
        catch { setError('Failed to load rejected users.'); }
        finally { setLoadRejected(false); }
    }, []);

    const fetchLogs = useCallback(async () => {
        setLoadLogs(true);
        try   { const { data } = await adminApi.get('/admin/logs');    setLogs(data.logs || []); }
        catch { setError('Failed to load logs.'); }
        finally { setLoadLogs(false); }
    }, []);

    const fetchCharts = useCallback(async () => {
        try { const { data } = await adminApi.get('/admin/charts'); setChartData(data); }
        catch { /* non-critical, fail silently */ }
    }, []);

    const refreshAll = () => { fetchStats(); fetchUsers(); fetchPending(); fetchRejected(); fetchLogs(); fetchCharts(); };
    useEffect(() => { refreshAll(); }, []);

    // ── Actions ──────────────────────────────────────────────────────────

    // Delete user permanently (All Users tab)
    const handleDelete = async () => {
        setDeleting(true);
        try {
            await adminApi.delete(`/admin/users/${deleteTarget._id}`);
            setUsers(prev => prev.filter(u => u._id !== deleteTarget._id));
            setSuccess(`${deleteTarget.name} deleted.`);
            fetchStats();
        } catch { setError('Failed to delete user.'); }
        finally { setDeleting(false); setDeleteTarget(null); }
    };

    // Deactivate / Reactivate (All Users tab)
    const handleToggle = async () => {
        const { user, action } = toggleTarget;
        setToggling(true);
        try {
            await adminApi.put(`/admin/users/${user._id}/${action}`);
            setUsers(prev => prev.map(u =>
                u._id === user._id
                    ? { ...u, status: action === 'deactivate' ? 'inactive' : 'approved' }
                    : u
            ));
            setSuccess(action === 'deactivate'
                ? `${user.name} deactivated — login blocked.`
                : `${user.name} reactivated — login restored.`
            );
        } catch { setError(`Failed to ${action} user.`); }
        finally { setToggling(false); setToggleTarget(null); }
    };

    // Approve / Reject (Pending tab)
    const handlePendingAction = async () => {
        const { user, action } = pendingTarget;
        setPendingAction(true);
        try {
            await adminApi.put(`/admin/users/${user._id}/${action}`);
            setPending(prev => prev.filter(u => u._id !== user._id));
            if (action === 'approve') {
                setSuccess(`${user.name} approved — they can now log in.`);
                fetchUsers();
            } else {
                setSuccess(`${user.name}'s registration rejected.`);
                fetchRejected();
            }
            fetchStats();
        } catch { setError(`Failed to ${action} user.`); }
        finally { setPendingAction(false); setPendingTarget(null); }
    };

    // Re-approve a rejected user
    const handleReApprove = async () => {
        setReApproving(true);
        try {
            await adminApi.put(`/admin/users/${reApproveTarget._id}/approve`);
            setRejected(prev => prev.filter(u => u._id !== reApproveTarget._id));
            setSuccess(`${reApproveTarget.name} re-approved — they can now log in.`);
            fetchUsers();
            fetchStats();
        } catch { setError('Failed to re-approve user.'); }
        finally { setReApproving(false); setReApproveTarget(null); }
    };

    // Open edit dialog
    const openEdit = (user) => {
        setEditTarget(user);
        setEditForm({
            name:        user.name        || '',
            role:        user.role        || '',
            designation: user.designation || '',
            affiliation: user.affiliation || '',
            phone:       user.phone       || '',
            purpose:     user.purpose     || '',
        });
    };

    // Save edited user
    const handleUpdate = async () => {
        setSaving(true);
        try {
            const { data } = await adminApi.put(`/admin/users/${editTarget._id}`, editForm);
            setUsers(prev => prev.map(u => u._id === editTarget._id ? data.user : u));
            setSuccess(`${data.user.name} updated successfully.`);
            setEditTarget(null);
        } catch { setError('Failed to update user.'); }
        finally { setSaving(false); }
    };

    const handleLogout = () => {
        localStorage.removeItem('medvid_admin_token');
        localStorage.removeItem('medvid_admin_user');
        nav('/admin/login');
    };

    // ── Filtered lists ───────────────────────────────────────────────────
    const filteredUsers = users.filter(u => {
        const q = search.toLowerCase();
        const matchSearch = u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
        const matchRole   = roleFilter === 'All' || u.role === roleFilter;
        return matchSearch && matchRole;
    });

    const filteredPending = pendingUsers.filter(u => {
        const q = search.toLowerCase();
        return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    });

    const filteredRejected = rejectedUsers.filter(u => {
        const q = search.toLowerCase();
        return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    });

    const filteredLogs = logs.filter(l => {
        const q = search.toLowerCase();
        return (
            l.action?.toLowerCase().includes(q) ||
            l.userId?.name?.toLowerCase().includes(q) ||
            l.entity?.toLowerCase().includes(q)
        );
    });

    // ── CSV Export ───────────────────────────────────────────────────────
    const downloadCSV = (rows, filename) => {
        if (!rows.length) return;
        const headers = Object.keys(rows[0]);
        const escape  = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const csv     = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
        const url     = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
        const a       = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    };

    const exportUsers = () => downloadCSV(
        filteredUsers.map(u => ({
            Name:        u.name,
            Email:       u.email,
            Role:        u.role,
            Status:      u.status || 'active',
            Designation: u.designation || '',
            Affiliation: u.affiliation || '',
            Phone:       u.phone || '',
            Joined:      new Date(u.createdAt).toLocaleDateString(),
        })),
        'medvid_users.csv'
    );

    const exportLogs = () => downloadCSV(
        filteredLogs.map(l => ({
            Action:    l.action,
            User:      l.userId?.name || 'Admin',
            Role:      l.userId?.role || 'System Admin',
            Entity:    l.entity || '',
            Details:   l.details || '',
            Status:    l.status,
            Timestamp: new Date(l.createdAt).toLocaleString(),
        })),
        'medvid_audit_logs.csv'
    );

    // ── Render ───────────────────────────────────────────────────────────
    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>

            {/* Top Bar */}
            <Box sx={{
                bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider',
                px: { xs: 2, md: 4 }, py: 1.5,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <AdminPanelSettings sx={{ color: CORAL, fontSize: 28 }} />
                    <Box>
                        <Typography variant="h6" fontWeight={800} sx={{ color: CORAL, lineHeight: 1 }}>
                            Admin Panel
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {adminUser.name} · {adminUser.email}
                        </Typography>
                    </Box>
                </Box>
                <Button variant="outlined" size="small" startIcon={<Logout />} onClick={handleLogout}
                    sx={{ borderColor: CORAL, color: CORAL, '&:hover': { borderColor: CORAL, bgcolor: `${CORAL}11` } }}>
                    Logout
                </Button>
            </Box>

            <Container maxWidth="xl" sx={{ py: 4 }}>


                {/* Stats */}
                <Grid container spacing={3} mb={4}>
                    {[
                        { icon: <Group />,           label: 'Total Users',   value: stats?.totalUsers,       accent },
                        { icon: <VideoLibrary />,    label: 'Total Videos',  value: stats?.totalVideos,      accent: isDark ? '#7BD9A0' : '#2e7d32' },
                        { icon: <MedicalServices />, label: 'Doctors',       value: stats?.totalDoctors,     accent: isDark ? '#AED6F1' : '#1F4E79' },
                        { icon: <PersonSearch />,    label: 'Consultants',   value: stats?.totalConsultants, accent: CORAL },
                    ].map((s, i) => (
                        <Grid item xs={6} md={3} key={i}>
                            <StatCard {...s} loading={loadStats} />
                        </Grid>
                    ))}
                </Grid>

                {/* Charts */}
                {chartData && (
                    <Grid container spacing={3} mb={4}>
                        {/* Role Distribution */}
                        <Grid item xs={12} md={6}>
                            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 3, height: 320, display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="subtitle1" fontWeight={700} mb={1}>Role Distribution</Typography>
                                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Box sx={{ width: 220, height: 220 }}>
                                        <Doughnut
                                            data={{
                                                labels: chartData.roles.map(r => r._id || 'Unknown'),
                                                datasets: [{
                                                    data: chartData.roles.map(r => r.count),
                                                    backgroundColor: ['#3AB0A9', '#FF7F50', '#AED6F1', '#7BD9A0', '#FFC857'],
                                                    borderWidth: 2,
                                                    borderColor: isDark ? '#1a2535' : '#fff',
                                                }],
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: {
                                                    legend: {
                                                        position: 'bottom',
                                                        labels: {
                                                            color: isDark ? '#ccc' : '#444',
                                                            padding: 16,
                                                            font: { size: 12 },
                                                            boxWidth: 12,
                                                            boxHeight: 12,
                                                            usePointStyle: true,
                                                        },
                                                    },
                                                },
                                                cutout: '65%',
                                            }}
                                        />
                                    </Box>
                                </Box>
                            </Card>
                        </Grid>

                        {/* Monthly Registrations */}
                        <Grid item xs={12} md={6}>
                            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 3, height: 320, display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="subtitle1" fontWeight={700} mb={1}>Registrations — Last 6 Months</Typography>
                                <Box sx={{ flex: 1, position: 'relative' }}>
                                    <Bar
                                        data={{
                                            labels: chartData.registrations.map(r => {
                                                const d = new Date(r._id.year, r._id.month - 1);
                                                return d.toLocaleString('default', { month: 'short', year: '2-digit' });
                                            }),
                                            datasets: [{
                                                label: 'New Users',
                                                data: chartData.registrations.map(r => r.count),
                                                backgroundColor: `${accent}99`,
                                                borderColor: accent,
                                                borderWidth: 2,
                                                borderRadius: 6,
                                            }],
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: false } },
                                            scales: {
                                                x: { ticks: { color: isDark ? '#aaa' : '#555' }, grid: { color: isDark ? '#ffffff11' : '#00000011' } },
                                                y: { ticks: { color: isDark ? '#aaa' : '#555', stepSize: 1 }, grid: { color: isDark ? '#ffffff11' : '#00000011' }, beginAtZero: true },
                                            },
                                        }}
                                    />
                                </Box>
                            </Card>
                        </Grid>
                    </Grid>
                )}

                {/* Tab Panel */}
                <Box sx={{
                    bgcolor: 'background.paper', borderRadius: 3,
                    border: '1px solid', borderColor: 'divider', overflow: 'hidden',
                }}>
                    {/* Tab bar */}
                    <Box sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        px: 2, pt: 1, borderBottom: '1px solid', borderColor: 'divider',
                        flexWrap: 'wrap', gap: 1,
                    }}>
                        <Tabs value={tab} onChange={(_, v) => { setTab(v); setSearch(''); setRoleFilter('All'); setUsersPage(0); setLogsPage(0); }}
                            sx={{ '& .MuiTab-root': { fontWeight: 700 } }}>
                            <Tab icon={<Person />} iconPosition="start" label="All Users" />
                            <Tab
                                iconPosition="start"
                                icon={
                                    <Badge badgeContent={pendingUsers.length} color="error" max={99}>
                                        <HourglassEmpty />
                                    </Badge>
                                }
                                label="Pending Approval"
                            />
                            <Tab
                                iconPosition="start"
                                icon={
                                    <Badge badgeContent={rejectedUsers.length} color="warning" max={99}>
                                        <PersonOff />
                                    </Badge>
                                }
                                label="Rejected"
                            />
                            <Tab icon={<Assignment />} iconPosition="start" label="Audit Logs" />
                        </Tabs>

                        <Box sx={{ display: 'flex', gap: 1, pb: 1 }}>
                            <TextField size="small" placeholder="Search..."
                                value={search} onChange={e => setSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search sx={{ fontSize: 18 }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ width: 200 }}
                            />
                            <Tooltip title="Refresh">
                                <IconButton onClick={refreshAll} size="small"><Refresh /></IconButton>
                            </Tooltip>
                        </Box>
                    </Box>

                    {/* ── All Users Tab ─────────────────────────────────── */}
                    {tab === 0 && (
                        <>
                            {/* Role filter chips */}
                            <Box sx={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                px: 2, py: 1.5, flexWrap: 'wrap', gap: 1,
                                borderBottom: '1px solid', borderColor: 'divider',
                            }}>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {['All', 'Doctor', 'Consultant'].map(role => (
                                    <Chip
                                        key={role}
                                        label={role === 'All'
                                            ? `All (${users.length})`
                                            : `${role} (${users.filter(u => u.role === role).length})`
                                        }
                                        onClick={() => setRoleFilter(role)}
                                        color={roleFilter === role ? (ROLE_COLOR[role] || 'default') : 'default'}
                                        variant={roleFilter === role ? 'filled' : 'outlined'}
                                        size="small"
                                        sx={{ fontWeight: 600, cursor: 'pointer' }}
                                    />
                                ))}
                                </Box>
                                <Tooltip title="Export as CSV">
                                    <Button size="small" startIcon={<Download />} onClick={exportUsers}
                                        sx={{ fontWeight: 600, color: accent, borderColor: accent, border: '1px solid', borderRadius: 2, px: 1.5 }}>
                                        Export
                                    </Button>
                                </Tooltip>
                            </Box>

                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={headSx}>
                                            {['Name', 'Email', 'Role', 'Status', 'Affiliation', 'Joined', 'Actions'].map(h => (
                                                <TableCell key={h} sx={TABLE_HEAD}>{h}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {loadUsers
                                            ? <SkeletonRows cols={7} />
                                            : filteredUsers.length === 0
                                                ? <EmptyRow colSpan={7}
                                                    icon={<Person sx={{ fontSize: 40 }} />}
                                                    text="No users found." />
                                                : filteredUsers.slice(usersPage * usersRowsPerPage, usersPage * usersRowsPerPage + usersRowsPerPage).map(user => (
                                                    <TableRow key={user._id} hover sx={LAST_ROW}>
                                                        <TableCell>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Avatar sx={{ width: 30, height: 30, fontSize: 13, bgcolor: `${accent}30`, color: accent }}>
                                                                    {user.name?.[0]?.toUpperCase()}
                                                                </Avatar>
                                                                <Typography variant="body2" fontWeight={600}>{user.name}</Typography>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip label={user.role} size="small"
                                                                color={ROLE_COLOR[user.role] || 'default'}
                                                                sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={user.status === 'inactive' ? 'Inactive' : 'Active'}
                                                                size="small"
                                                                color={user.status === 'inactive' ? 'error' : 'success'}
                                                                sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {user.affiliation || '—'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {new Date(user.createdAt).toLocaleDateString()}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                                <Tooltip title="View / Edit">
                                                                    <IconButton size="small"
                                                                        onClick={() => openEdit(user)}
                                                                        sx={{ color: 'info.main' }}>
                                                                        <Visibility fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                {user.status === 'inactive'
                                                                    ? (
                                                                        <Tooltip title="Reactivate">
                                                                            <IconButton size="small"
                                                                                onClick={() => setToggleTarget({ user, action: 'reactivate' })}
                                                                                sx={{ color: 'success.main' }}>
                                                                                <LockOpen fontSize="small" />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    ) : (
                                                                        <Tooltip title="Deactivate">
                                                                            <IconButton size="small"
                                                                                onClick={() => setToggleTarget({ user, action: 'deactivate' })}
                                                                                sx={{ color: 'warning.main' }}>
                                                                                <Block fontSize="small" />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    )
                                                                }
                                                                <Tooltip title="Delete permanently">
                                                                    <IconButton size="small"
                                                                        onClick={() => setDeleteTarget(user)}
                                                                        sx={{ color: 'error.main' }}>
                                                                        <Delete fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Box>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                        }
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <TablePagination
                                component="div"
                                count={filteredUsers.length}
                                page={usersPage}
                                onPageChange={(_, p) => setUsersPage(p)}
                                rowsPerPage={usersRowsPerPage}
                                onRowsPerPageChange={e => { setUsersRowsPerPage(parseInt(e.target.value, 10)); setUsersPage(0); }}
                                rowsPerPageOptions={[5, 10, 25]}
                            />
                        </>
                    )}

                    {/* ── Pending Approval Tab ──────────────────────────── */}
                    {tab === 1 && (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={headSx}>
                                        {['Name', 'Email', 'Role', 'Affiliation', 'Purpose', 'Requested', 'Actions'].map(h => (
                                            <TableCell key={h} sx={TABLE_HEAD}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loadPending
                                        ? <SkeletonRows cols={7} rows={4} />
                                        : filteredPending.length === 0
                                            ? <EmptyRow colSpan={7}
                                                icon={<HourglassEmpty sx={{ fontSize: 40 }} />}
                                                text="No pending registration requests." />
                                            : filteredPending.map(user => (
                                                <TableRow key={user._id} hover sx={LAST_ROW}>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Avatar sx={{ width: 30, height: 30, fontSize: 13, bgcolor: `${CORAL}25`, color: CORAL }}>
                                                                {user.name?.[0]?.toUpperCase()}
                                                            </Avatar>
                                                            <Typography variant="body2" fontWeight={600}>{user.name}</Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip label={user.role} size="small"
                                                            color={ROLE_COLOR[user.role] || 'default'}
                                                            sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" color="text.secondary">{user.affiliation || '—'}</Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ maxWidth: 180 }}>
                                                        <Typography variant="body2" color="text.secondary" noWrap>{user.purpose || '—'}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {new Date(user.createdAt).toLocaleDateString()}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                            <Tooltip title="Approve">
                                                                <IconButton size="small"
                                                                    onClick={() => setPendingTarget({ user, action: 'approve' })}
                                                                    sx={{ color: 'success.main' }}>
                                                                    <CheckCircle fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Reject">
                                                                <IconButton size="small"
                                                                    onClick={() => setPendingTarget({ user, action: 'reject' })}
                                                                    sx={{ color: 'error.main' }}>
                                                                    <Cancel fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                    }
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {/* ── Rejected Users Tab ───────────────────────────── */}
                    {tab === 2 && (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={headSx}>
                                        {['Name', 'Email', 'Role', 'Affiliation', 'Rejected On', 'Actions'].map(h => (
                                            <TableCell key={h} sx={TABLE_HEAD}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loadRejected
                                        ? <SkeletonRows cols={6} rows={4} />
                                        : filteredRejected.length === 0
                                            ? <EmptyRow colSpan={6}
                                                icon={<PersonOff sx={{ fontSize: 40 }} />}
                                                text="No rejected registrations." />
                                            : filteredRejected.map(user => (
                                                <TableRow key={user._id} hover sx={LAST_ROW}>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Avatar sx={{ width: 30, height: 30, fontSize: 13, bgcolor: 'rgba(255,77,79,0.15)', color: 'error.main' }}>
                                                                {user.name?.[0]?.toUpperCase()}
                                                            </Avatar>
                                                            <Typography variant="body2" fontWeight={600}>{user.name}</Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell><Typography variant="body2" color="text.secondary">{user.email}</Typography></TableCell>
                                                    <TableCell>
                                                        <Chip label={user.role} size="small"
                                                            color={ROLE_COLOR[user.role] || 'default'}
                                                            sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                                                    </TableCell>
                                                    <TableCell><Typography variant="body2" color="text.secondary">{user.affiliation || '—'}</Typography></TableCell>
                                                    <TableCell><Typography variant="body2" color="text.secondary">{new Date(user.createdAt).toLocaleDateString()}</Typography></TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                            <Tooltip title="Re-approve">
                                                                <IconButton size="small"
                                                                    onClick={() => setReApproveTarget(user)}
                                                                    sx={{ color: 'success.main' }}>
                                                                    <CheckCircle fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Delete permanently">
                                                                <IconButton size="small"
                                                                    onClick={() => setDeleteTarget(user)}
                                                                    sx={{ color: 'error.main' }}>
                                                                    <Delete fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                    }
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {/* ── Audit Logs Tab ────────────────────────────────── */}
                    {tab === 3 && (
                        <>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Tooltip title="Export as CSV">
                                <Button size="small" startIcon={<Download />} onClick={exportLogs}
                                    sx={{ fontWeight: 600, color: accent, borderColor: accent, border: '1px solid', borderRadius: 2, px: 1.5 }}>
                                    Export
                                </Button>
                            </Tooltip>
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={headSx}>
                                        {['Action', 'User', 'Entity', 'Details', 'Status', 'Time'].map(h => (
                                            <TableCell key={h} sx={TABLE_HEAD}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loadLogs
                                        ? <SkeletonRows cols={6} rows={8} />
                                        : filteredLogs.length === 0
                                            ? <EmptyRow colSpan={6}
                                                icon={<Assignment sx={{ fontSize: 40 }} />}
                                                text="No logs found." />
                                            : filteredLogs.slice(logsPage * logsRowsPerPage, logsPage * logsRowsPerPage + logsRowsPerPage).map(log => (
                                                <TableRow key={log._id} hover sx={LAST_ROW}>
                                                    <TableCell>
                                                        <Typography variant="caption" fontWeight={700}
                                                            sx={{ color: ACTION_COLOR[log.action] || accent }}>
                                                            {log.action}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2">{log.userId?.name || 'Admin'}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{log.userId?.role || 'System Admin'}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" color="text.secondary">{log.entity || '—'}</Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ maxWidth: 260 }}>
                                                        <Typography variant="body2" color="text.secondary" noWrap>{log.details || '—'}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        {log.status === 'success'
                                                            ? <CheckCircle sx={{ color: 'success.main', fontSize: 18 }} />
                                                            : <Cancel sx={{ color: 'error.main', fontSize: 18 }} />
                                                        }
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {new Date(log.createdAt).toLocaleString()}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                    }
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={filteredLogs.length}
                            page={logsPage}
                            onPageChange={(_, p) => setLogsPage(p)}
                            rowsPerPage={logsRowsPerPage}
                            onRowsPerPageChange={e => { setLogsRowsPerPage(parseInt(e.target.value, 10)); setLogsPage(0); }}
                            rowsPerPageOptions={[10, 25, 50]}
                        />
                        </>
                    )}
                </Box>
            </Container>

            {/* ── Delete Dialog ─────────────────────────────────────────── */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle fontWeight={700}>Delete User</DialogTitle>
                <DialogContent>
                    <Typography>
                        Permanently delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
                        {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Deactivate / Reactivate Dialog ───────────────────────── */}
            <Dialog open={!!toggleTarget} onClose={() => setToggleTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle fontWeight={700}>
                    {toggleTarget?.action === 'deactivate' ? 'Deactivate User' : 'Reactivate User'}
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        {toggleTarget?.action === 'deactivate'
                            ? <>Deactivate <strong>{toggleTarget?.user?.name}</strong>? Their login will be blocked immediately.</>
                            : <>Reactivate <strong>{toggleTarget?.user?.name}</strong>? They will be able to log in again.</>
                        }
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setToggleTarget(null)} disabled={toggling}>Cancel</Button>
                    <Button
                        variant="contained"
                        color={toggleTarget?.action === 'deactivate' ? 'warning' : 'success'}
                        onClick={handleToggle} disabled={toggling}>
                        {toggling ? 'Processing...' : toggleTarget?.action === 'deactivate' ? 'Deactivate' : 'Reactivate'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Toast Notifications ──────────────────────────────────── */}
            <Snackbar
                open={!!success}
                autoHideDuration={4000}
                onClose={() => setSuccess(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSuccess(null)}
                    severity="success"
                    variant="filled"
                    sx={{
                        borderRadius: 2,
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        minWidth: 320,
                    }}
                >
                    {success}
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!error}
                autoHideDuration={5000}
                onClose={() => setError(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setError(null)}
                    severity="error"
                    variant="filled"
                    sx={{
                        borderRadius: 2,
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        minWidth: 320,
                    }}
                >
                    {error}
                </Alert>
            </Snackbar>

            {/* ── Re-Approve Dialog ─────────────────────────────────────── */}
            <Dialog open={!!reApproveTarget} onClose={() => setReApproveTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle fontWeight={700}>Re-approve Registration</DialogTitle>
                <DialogContent>
                    <Typography>
                        Re-approve <strong>{reApproveTarget?.name}</strong>? Their account will be restored and they will be able to log in immediately.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setReApproveTarget(null)} disabled={reApproving}>Cancel</Button>
                    <Button variant="contained" color="success" onClick={handleReApprove} disabled={reApproving}>
                        {reApproving ? 'Processing...' : 'Re-approve'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── View / Edit User Dialog ──────────────────────────────── */}
            <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="sm" fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle fontWeight={800} sx={{ color: CORAL, borderBottom: '1px solid', borderColor: 'divider', pb: 1.5 }}>
                    User Details
                </DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '20px !important' }}>
                    {[
                        { label: 'Full Name',   key: 'name' },
                        { label: 'Designation', key: 'designation' },
                        { label: 'Affiliation', key: 'affiliation' },
                        { label: 'Phone',       key: 'phone' },
                    ].map(({ label, key }) => (
                        <TextField
                            key={key}
                            label={label}
                            value={editForm[key] || ''}
                            onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                            fullWidth
                            size="small"
                            sx={{
                                '& label.Mui-focused': { color: CORAL },
                                '& .MuiOutlinedInput-root': {
                                    '&:hover fieldset':       { borderColor: CORAL },
                                    '&.Mui-focused fieldset': { borderColor: CORAL },
                                },
                            }}
                        />
                    ))}
                    <TextField
                        label="Purpose"
                        value={editForm.purpose || ''}
                        onChange={e => setEditForm(prev => ({ ...prev, purpose: e.target.value }))}
                        fullWidth
                        size="small"
                        multiline
                        minRows={2}
                        sx={{
                            '& label.Mui-focused': { color: CORAL },
                            '& .MuiOutlinedInput-root': {
                                '&:hover fieldset':       { borderColor: CORAL },
                                '&.Mui-focused fieldset': { borderColor: CORAL },
                            },
                        }}
                    />
                    <TextField label="Role"  value={editTarget?.role  || ''} fullWidth size="small" disabled helperText="Role cannot be changed" />
                    <TextField label="Email" value={editTarget?.email || ''} fullWidth size="small" disabled helperText="Email cannot be changed" />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, borderTop: '1px solid', borderColor: 'divider', mt: 1 }}>
                    <Button onClick={() => setEditTarget(null)} disabled={saving}>Cancel</Button>
                    <Button variant="contained" onClick={handleUpdate} disabled={saving}
                        sx={{ bgcolor: CORAL, color: '#fff', fontWeight: 700, '&:hover': { bgcolor: '#e8623a' } }}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Approve / Reject Dialog ───────────────────────────────── */}
            <Dialog open={!!pendingTarget} onClose={() => setPendingTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle fontWeight={700}>
                    {pendingTarget?.action === 'approve' ? 'Approve Registration' : 'Reject Registration'}
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        {pendingTarget?.action === 'approve'
                            ? <>Approve <strong>{pendingTarget?.user?.name}</strong> as a <strong>{pendingTarget?.user?.role}</strong>? They will be able to log in immediately.</>
                            : <>Reject <strong>{pendingTarget?.user?.name}</strong>'s registration? They will not be able to log in.</>
                        }
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setPendingTarget(null)} disabled={pendingAction}>Cancel</Button>
                    <Button
                        variant="contained"
                        color={pendingTarget?.action === 'approve' ? 'success' : 'error'}
                        onClick={handlePendingAction} disabled={pendingAction}>
                        {pendingAction ? 'Processing...' : pendingTarget?.action === 'approve' ? 'Approve' : 'Reject'}
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
}