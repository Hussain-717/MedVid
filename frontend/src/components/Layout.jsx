// src/components/Layout.jsx - FINAL SCROLLING & LAYOUT FIX

import React, { useState } from "react";
import { Box, Toolbar, useMediaQuery, useTheme } from "@mui/material";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { drawerWidth } from "../constants"; // Assuming drawerWidth = 240
import { Outlet } from "react-router-dom";

export default function Layout() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const isAuthenticated = !!localStorage.getItem("medvid_token");

    return (
        // FIX A: Top-level box ko fixed height (100vh) do aur body scrollbar ko chhupao.
        <Box 
            sx={{ 
                display: "flex", 
                height: '100vh',         // Poori Viewport Height lo
                overflow: 'hidden',      // Browser ki scrollbar chhupao
                bgcolor: theme.palette.background.default 
            }}
        >
            {/* Header (position: fixed hona chahiye) */}
            <Header isAuthenticated={isAuthenticated} handleDrawerToggle={handleDrawerToggle} />
            
            {/* Sidebar (position: fixed/sticky hona chahiye) */}
            {isAuthenticated && (
                <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isAuthenticated={isAuthenticated} />
            )}

            {/* 3. MAIN CONTENT AREA (Jahan pages render hote hain) */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1, 
                    p: 3,
                    
                    // FIX B: Is content area ko scrollable banao
                    height: '100%',         // Parent ki poori height lo
                    overflowY: 'auto',      // Content zyada ho toh scroll karo

                    // --- OVERLAP FIX: Margin-Left Add Karna ---
                    width: { sm: isAuthenticated ? `calc(100% - ${drawerWidth}px)` : '100%' },
                    ml: { sm: isAuthenticated ? `${drawerWidth}px` : '0' },
                }}
            >
                {/* Toolbar: Fixed Header ke neeche content ko dhakelne ke liye (Header ki height jitni space) */}
                <Toolbar />
                
                {/* Outlet: Jahan page content render hoga (e.g., History, Profile) */}
                <Outlet />
            </Box>
        </Box>
    );
}