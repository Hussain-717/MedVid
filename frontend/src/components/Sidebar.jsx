import React from "react";
import {
    Drawer, List, ListItemButton, ListItemIcon, ListItemText,
    Toolbar, useTheme, Box, Typography, Divider, Badge
} from "@mui/material";
import { NavLink, useNavigate } from "react-router-dom";
import {
    Dashboard as DashboardIcon, History as HistoryIcon,
    Chat as ChatIcon, Science, AccountCircle,
    Settings as SettingsIcon, Info, Logout, Visibility,
    BusinessCenter, Security
} from "@mui/icons-material";
import { drawerWidth } from "../constants";
import { useNotifications } from "../context/NotificationContext";

export default function Sidebar({ mobileOpen, handleDrawerToggle }) {
    const theme    = useTheme();
    const navigate = useNavigate();

    const user         = JSON.parse(localStorage.getItem("medvid_user") || "{}");
    const isConsultant = user.role === 'Consultant';
    const accentColor  = isConsultant ? '#FF7F50' : (theme.palette.info.main || '#0288d1');

    const { unreadCount, clearUnread } = useNotifications();

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
        window.location.reload();
    };

    const ChatBadgeIcon = () => (
        <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16, fontWeight: 700 } }}
        >
            <ChatIcon />
        </Badge>
    );

    const primaryMenuItems = isConsultant
        ? [
            { text: 'Dashboard',    icon: <BusinessCenter />,  path: '/consDashboard' },
            { text: 'Review Queue', icon: <HistoryIcon />,     path: '/history' },
            { text: 'Audit Logs',   icon: <Security />,        path: '/logs' },
            { text: 'Doctor Chat',  icon: <ChatBadgeIcon />,   path: '/consultant', isChat: true },
          ]
        : [
            { text: 'Dashboard',       icon: <DashboardIcon />, path: '/dashboard' },
            { text: 'New Diagnostic',  icon: <Science />,       path: '/upload' },
            { text: 'Reports History', icon: <HistoryIcon />,   path: '/history' },
            { text: 'Consultant Chat', icon: <ChatBadgeIcon />, path: '/consultant', isChat: true },
          ];

    const secondaryMenuItems = [
        { text: 'Profile',      icon: <AccountCircle />, path: '/profile' },
        { text: 'Settings',     icon: <SettingsIcon />,  path: '/settings' },
        { text: 'About MedViD', icon: <Info />,          path: '/about' },
    ];

    const getLinkStyles = (isActive) => ({
        minHeight: 48, px: 2.5,
        color: theme.palette.text.primary,
        borderRadius: '8px', mx: 1, my: 0.5,
        transition: 'all 0.2s ease',
        ...(isActive && {
            bgcolor: `${accentColor}15`,
            borderLeft: `4px solid ${accentColor}`,
            color: accentColor,
            '& .MuiListItemIcon-root': { color: accentColor }
        }),
        '&:hover': {
            bgcolor: `${accentColor}10`,
            borderLeft: `4px solid ${accentColor}80`,
        },
    });

    const drawerContent = (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: theme.palette.background.paper }}>
            <Toolbar sx={{
                justifyContent: 'center',
                bgcolor: theme.palette.background.default,
                borderBottom: `1px solid ${accentColor}30`,
                minHeight: 64
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Visibility sx={{ color: accentColor, fontSize: 28, mr: 1 }} />
                    <Typography variant="h6" noWrap sx={{ color: accentColor, fontWeight: 'bold', letterSpacing: 1 }}>
                        MedViD
                    </Typography>
                </Box>
            </Toolbar>

            <Box sx={{ overflow: 'auto', pt: 2, flexGrow: 1 }}>
                <List sx={{ px: 1 }}>
                    {primaryMenuItems.map((item) => (
                        <ListItemButton
                            key={item.text}
                            component={NavLink}
                            to={item.path}
                            onClick={() => {
                                if (item.isChat) clearUnread();
                                handleDrawerToggle();
                            }}
                            sx={({ isActive }) => getLinkStyles(isActive)}
                        >
                            <ListItemIcon sx={{ minWidth: 40, color: accentColor, opacity: 0.8 }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={item.text}
                                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: '500' }}
                            />
                        </ListItemButton>
                    ))}
                </List>

                <Divider sx={{ bgcolor: `${accentColor}15`, my: 2, mx: 2 }} />

                <List sx={{ px: 1 }}>
                    {secondaryMenuItems.map((item) => (
                        <ListItemButton
                            key={item.text}
                            component={NavLink}
                            to={item.path}
                            onClick={handleDrawerToggle}
                            sx={({ isActive }) => getLinkStyles(isActive)}
                        >
                            <ListItemIcon sx={{ minWidth: 40, color: accentColor, opacity: 0.8 }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={item.text}
                                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: '500' }}
                            />
                        </ListItemButton>
                    ))}
                </List>

                <Divider sx={{ bgcolor: `${accentColor}15`, my: 2, mx: 2 }} />

                <List sx={{ px: 1 }}>
                    <ListItemButton
                        onClick={handleLogout}
                        sx={{
                            minHeight: 48, px: 2.5, mx: 1,
                            color: theme.palette.error.main,
                            borderRadius: '8px',
                            '&:hover': { bgcolor: `${theme.palette.error.main}10` }
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 40, color: theme.palette.error.main }}>
                            <Logout />
                        </ListItemIcon>
                        <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 'bold' }} />
                    </ListItemButton>
                </List>
            </Box>
        </Box>
    );

    return (
        <nav aria-label="sidebar">
            <Drawer
                variant="temporary" open={mobileOpen} onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: "block", sm: "none" },
                    "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth, borderRight: 'none' },
                }}
            >
                {drawerContent}
            </Drawer>
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: "none", sm: "block" },
                    "& .MuiDrawer-paper": {
                        boxSizing: "border-box", width: drawerWidth, top: 0,
                        borderRight: `1px solid ${accentColor}20`,
                        boxShadow: `4px 0 10px ${accentColor}05`
                    },
                }}
                open
            >
                {drawerContent}
            </Drawer>
        </nav>
    );
}