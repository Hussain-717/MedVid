import React, { useContext } from "react";

import { AppBar, Toolbar, Typography, Button, IconButton, Box } from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";

import { Link, useNavigate } from "react-router-dom";

import { useTheme } from "@mui/material/styles";

import { LightMode, DarkMode, Visibility } from "@mui/icons-material";

import { ColorModeContext } from "../context/ThemeContext";

import { drawerWidth } from "../constants";



export default function Header({ isAuthenticated = false, handleDrawerToggle = () => {} }) {

    const navigate = useNavigate();

    const theme = useTheme();

    const colorMode = useContext(ColorModeContext);



    const logout = () => {

        localStorage.removeItem("medvid_token");

        localStorage.removeItem("medvid_user");

        navigate("/login");

    };



    const headerBgColor = theme.palette.background.paper;

    const accentColor = theme.palette.infoHighlight;



    return (

        <AppBar

            position="fixed"

            sx={{

                zIndex: (theme) => theme.zIndex.drawer + 1,

                bgcolor: headerBgColor,

                borderBottom: `1px solid ${accentColor}50`,

                width: { sm: isAuthenticated ? `calc(100% - ${drawerWidth}px)` : '100%' },

                ml: { sm: isAuthenticated ? `${drawerWidth}px` : '0' },

            }}

        >

            <Toolbar>

                {/* Hamburger menu for mobile (only visible if authenticated) */}

                {isAuthenticated && (

                    <IconButton

                        // ONLY ONE SX PROPERTY HERE: Merging both previous sx blocks

                        sx={{

                            color: accentColor,

                            mr: 2,

                            display: { sm: "none" }

                        }}

                        edge="start"

                        onClick={handleDrawerToggle}

                        aria-label="open drawer"

                    >

                        <MenuIcon />

                    </IconButton>

                )}



                {/* Logo/Project Name (Visible only when Sidebar is NOT visible on desktop) */}

                <Typography

                    variant="h6"

                    component={Link}

                    to="/"

                    sx={{

                        flexGrow: { xs: 1, sm: isAuthenticated ? 0 : 1 },

                        fontWeight: "bold",

                        textDecoration: "none",

                        color: isAuthenticated ? theme.palette.text.primary : accentColor,

                        display: {

                            xs: 'flex',

                            sm: isAuthenticated ? 'none' : 'flex'

                        },

                        alignItems: 'center'

                    }}

                >

                    <Visibility sx={{ mr: 1, fontSize: 24, color: isAuthenticated ? theme.palette.primary.main : accentColor }} />

                    MedViD

                </Typography>

               

                {/* --- SPACER BOX --- */}

                {isAuthenticated && (

                    <Box

                        sx={{

                            flexGrow: 1,

                            display: { xs: 'none', sm: 'flex' }

                        }}

                    />

                )}

                {/* --- SPACER KHATAM --- */}



                {/* --- RIGHT SIDE ACTION BOX --- */}

                <Box sx={{ display: "flex", gap: 1, alignItems: 'center' }}>

                   

                    {/* 1. Theme Toggle Button (Always visible) */}

                    <IconButton onClick={colorMode.toggleColorMode} color="inherit">

                        {theme.palette.mode === 'dark' ? (

                            <LightMode sx={{ color: accentColor }} />

                        ) : (

                            <DarkMode sx={{ color: accentColor }} />

                        )}

                    </IconButton>



                    {/* 2. Login/Signup or Logout */}

                    {!isAuthenticated ? (

                        <>

                            <Button

                                component={Link}

                                to="/login"

                                sx={{ color: theme.palette.text.primary, '&:hover': { color: accentColor } }}

                            >

                                Login

                            </Button>

                            <Button

                                component={Link}

                                to="/signup"

                                variant="contained"

                                color="primary"

                                sx={{

                                    boxShadow: 'none',

                                    '&:hover': { boxShadow: `0 0 10px ${theme.palette.primary.main}50` }

                                }}

                            >

                                Signup

                            </Button>

                        </>

                    ) : (

                        <Button

                            onClick={logout}

                            sx={{ color: theme.palette.error.main, '&:hover': { bgcolor: '#ff6b6b20' } }}

                        >

                            Logout

                        </Button>

                    )}

                </Box>

            </Toolbar>

        </AppBar>

    );

}