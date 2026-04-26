import React, { useEffect, useRef, createContext, useContext, useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { io as socketIO } from "socket.io-client";
import { Snackbar, Alert, Typography, Box } from "@mui/material";
import { ThemeContextProvider } from "./context/ThemeContext";
import { NotificationProvider, useNotifications } from "./context/NotificationContext";
import AppRoutes from "./routes/AppRoutes";

export const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

function MessageToast({ toast, onClose }) {
    return (
        <Snackbar
            open={toast.open}
            autoHideDuration={4000}
            onClose={onClose}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            sx={{ top: { xs: 70, sm: 70 } }}
        >
            <Alert
                onClose={onClose}
                icon={false}
                sx={{
                    bgcolor: '#FF7F50',
                    color: 'white',
                    borderRadius: '10px',
                    boxShadow: '0 4px 20px rgba(255,127,80,0.4)',
                    minWidth: 280,
                    '& .MuiAlert-action': { color: 'white', alignItems: 'flex-start', pt: 0.5 }
                }}
            >
                <Box>
                    <Typography variant="body2" fontWeight={700} sx={{ mb: 0.3 }}>
                        💬 New message from {toast.senderName || 'a contact'}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>
                        {toast.text?.length > 70 ? toast.text.slice(0, 70) + '…' : (toast.text || '')}
                    </Typography>
                </Box>
            </Alert>
        </Snackbar>
    );
}

function AppInner({ socketRef }) {
    const { incrementUnread } = useNotifications();
    const [toast, setToast] = useState({ open: false, senderName: '', text: '' });

    useEffect(() => {
        const socket = socketRef?.current;
        if (!socket) return;

        const handleIncomingMessage = (data) => {
            const onChatPage = window.location.pathname === '/consultant';
            if (!onChatPage) {
                incrementUnread();
                setToast({ open: true, senderName: data.senderName || '', text: data.text || '' });
            }
        };

        socket.on('receive_message', handleIncomingMessage);
        return () => socket.off('receive_message', handleIncomingMessage);
    }, [socketRef, incrementUnread]);

    return (
        <>
            <AppRoutes />
            <MessageToast
                toast={toast}
                onClose={() => setToast(p => ({ ...p, open: false }))}
            />
        </>
    );
}

function App() {
    const socketRef = useRef(null);

    useEffect(() => {
        const isFirstLoad = !sessionStorage.getItem("medvid_app_loaded");
        if (isFirstLoad) {
            localStorage.removeItem("medvid_token");
            localStorage.removeItem("medvid_admin_token");
            localStorage.removeItem("medvid_user");
            sessionStorage.setItem("medvid_app_loaded", "true");
        }
    }, []);

    useEffect(() => {
        const socket = socketIO("http://localhost:5000", {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log("✅ Global socket connected:", socket.id);
            const user = JSON.parse(localStorage.getItem("medvid_user") || "{}");
            const myId = user.id || user._id;
            if (myId) {
                socket.emit('user_connected', String(myId));
                console.log("✅ Registered userId:", myId);
            }
        });

        socket.on('reconnect', () => {
            const user = JSON.parse(localStorage.getItem("medvid_user") || "{}");
            const myId = user.id || user._id;
            if (myId) {
                socket.emit('user_connected', String(myId));
                console.log("✅ Re-registered after reconnect:", myId);
            }
        });

        socket.on('disconnect', () => console.log("❌ Global socket disconnected"));

        return () => { socket.disconnect(); };
    }, []);

    return (
        <SocketContext.Provider value={socketRef}>
            <ThemeContextProvider>
                <NotificationProvider>
                    <Router>
                        <AppInner socketRef={socketRef} />
                    </Router>
                </NotificationProvider>
            </ThemeContextProvider>
        </SocketContext.Provider>
    );
}

export default App;