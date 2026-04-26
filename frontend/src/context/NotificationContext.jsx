// src/context/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const NotificationContext = createContext(null);
export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }) {
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnread = useCallback(async () => {
        try {
            const token = localStorage.getItem('medvid_token');
            if (!token) return;
            const res = await api.get('/chat/unread');
            setUnreadCount(res.data.unreadCount || 0);
        } catch {
            // silently fail
        }
    }, []);

    const incrementUnread = useCallback(() => {
        setUnreadCount(prev => prev + 1);
    }, []);

    const clearUnread = useCallback(() => {
        setUnreadCount(0);
    }, []);

    // Fetch on mount + poll every 30s as fallback
    useEffect(() => {
        fetchUnread();
        const interval = setInterval(fetchUnread, 30000);
        return () => clearInterval(interval);
    }, [fetchUnread]);

    return (
        <NotificationContext.Provider value={{ unreadCount, fetchUnread, incrementUnread, clearUnread }}>
            {children}
        </NotificationContext.Provider>
    );
}
