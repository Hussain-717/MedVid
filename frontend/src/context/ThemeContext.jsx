import React, { createContext, useState, useMemo, useContext } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// 1. Theme Configuration based on your defined palettes
const getDesignTokens = (mode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          primary:   { main: '#1F4E79' },
          secondary: { main: '#3AB0A9' },
          success:   { main: '#A8E6CF' },
          warning:   { main: '#FFC857' },
          error:     { main: '#FF6B6B' },
          background: {
              default: '#FFFFFF',
              paper:   '#F4F4F9',
          },
          text: {
              primary:   '#2E2E2E',
              secondary: '#6B6B6B',
          },
          infoHighlight: '#0288d1', // Matches sidebar blue (info.main default)
        }
      : {
          // ------------------------------------
          // Dark Theme Palette
          // ------------------------------------
          primary: { main: '#AED6F1' }, // Light Blue (Primary Buttons / Headers)
          secondary: { main: '#3AB0A9' }, // Teal (Secondary Buttons / Highlights)
          success: { main: '#7BD9A0' }, 
          warning: { main: '#FFC857' }, 
          error: { main: '#FF6B6B' }, 
          
          background: { 
              default: '#1F1F1F',  // Charcoal / Dark Gray (Background / Page)
              paper: '#2E2E2E',    // Dark Gray (Card / Panel Background)
          },
          text: { 
              primary: '#FFFFFF', // White
              secondary: '#B0B0B0', // Light Gray
          },
          // Custom color property for highlights/accents (used as the 'neon' color)
          infoHighlight: '#AED6F1', // Using Light Blue for accents
        }),
  },
  typography: {
    fontFamily: ['Roboto', 'Arial', 'sans-serif'].join(','),
  },
  medvidAccent: {
    main: mode === 'light' ? '#0288d1' : '#AED6F1',
  },
});

// 2. Create the Context
export const ColorModeContext = createContext({ toggleColorMode: () => {} });

// 3. Theme Provider Component
export function ThemeContextProvider({ children }) {
  // Check localStorage for preferred mode, default to 'dark'
  const [mode, setMode] = useState(
    localStorage.getItem('medvid_theme') || 'dark'
  );

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('medvid_theme', newMode);
          return newMode;
        });
      },
    }),
    [],
  );

  // Generate the MUI Theme object
  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}