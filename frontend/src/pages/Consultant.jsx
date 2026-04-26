import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNotifications } from "../context/NotificationContext";
import {
    Container, Typography, Paper, TextField, Button, Box, useTheme,
    Chip, List, ListItem, ListItemText, ListItemAvatar, Avatar,
    Badge, CircularProgress, Alert
} from "@mui/material";
import {
    Send as SendIcon, Share, RateReview,
    AssignmentTurnedIn, Search, Chat, FiberManualRecord,
    DeleteOutline
} from "@mui/icons-material";
import {
    getConsultantList,
    getChatMessages,
    sendChatMessage
} from "../services/api";
import api from "../services/api";
import { useSocket } from "../App";

// ── Message Bubble ─────────────────────────────────────────────────────
const Message = ({ msg, isMe, accentColor, theme }) => {

    // ✅ PDF download with auth token
    const handleDownloadReport = async () => {
        try {
            const token    = localStorage.getItem('medvid_token');
            const response = await fetch(msg.reportUrl, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Download failed');
            const blob     = await response.blob();
            const url      = window.URL.createObjectURL(blob);
            const a        = document.createElement('a');
            a.href         = url;
            a.download     = `MedVid-Report.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Failed to download report. Please try again.');
        }
    };

    return (
        <Box sx={{
            mb: 1.5,
            display: "flex",
            justifyContent: isMe ? "flex-end" : "flex-start"
        }}>
            <Paper elevation={1} sx={{
                p: 1.5,
                borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                maxWidth: "75%",
                wordWrap: "break-word",
                bgcolor: isMe ? accentColor : theme.palette.background.default,
                color:   isMe ? "white"      : theme.palette.text.primary,
                border:  isMe ? 'none'       : `1px solid ${theme.palette.divider}`
            }}>
                {/* Case ID chip */}
                {msg.videoId && (
                    <Chip
                        label={`📎 Case: ${String(msg.videoId).slice(-8)}`}
                        size="small"
                        sx={{
                            mb: 1, fontSize: '0.7rem',
                            bgcolor: isMe ? 'rgba(255,255,255,0.2)' : accentColor + '20',
                            color:   isMe ? 'white' : accentColor
                        }}
                    />
                )}

                {/* Message text */}
                <Typography variant="body2" sx={{ fontWeight: 500, whiteSpace: 'pre-line' }}>
                    {msg.text}
                </Typography>

                {/* ✅ Report download button — uses fetch with auth */}
                {msg.reportUrl && (
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={handleDownloadReport}
                        sx={{
                            mt: 1, mr: 1, fontSize: '0.72rem',
                            color:       isMe ? 'white' : accentColor,
                            borderColor: isMe ? 'rgba(255,255,255,0.5)' : accentColor + '60',
                            '&:hover': {
                                bgcolor:     isMe ? 'rgba(255,255,255,0.1)' : accentColor + '10',
                                borderColor: isMe ? 'white' : accentColor,
                            }
                        }}
                    >
                        📄 Download Report
                    </Button>
                )}

                {/* ✅ Video clip button */}
                {msg.clipUrl && (
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => window.open(msg.clipUrl, '_blank')}
                        sx={{
                            mt: 1, fontSize: '0.72rem',
                            color:       isMe ? 'white' : accentColor,
                            borderColor: isMe ? 'rgba(255,255,255,0.5)' : accentColor + '60',
                            '&:hover': {
                                bgcolor:     isMe ? 'rgba(255,255,255,0.1)' : accentColor + '10',
                                borderColor: isMe ? 'white' : accentColor,
                            }
                        }}
                    >
                        🎥 View Heatmap Clip
                    </Button>
                )}

                {/* Timestamp */}
                <Typography variant="caption" display="block" sx={{
                    mt: 0.5, textAlign: 'right',
                    color: isMe ? 'rgba(255,255,255,0.7)' : theme.palette.text.secondary
                }}>
                    {msg.time}
                </Typography>
            </Paper>
        </Box>
    );
};

// ── Main Component ─────────────────────────────────────────────────────
export default function CollaborativeChat() {
    const theme           = useTheme();
    const messagesEnd     = useRef(null);
    const globalSocketRef = useSocket();

    const user         = JSON.parse(localStorage.getItem("medvid_user") || "{}");
    const isConsultant = user.role === 'Consultant';
    const accentColor  = isConsultant ? "#FF7F50" : theme.palette.info.main;

    const [contactList,     setContactList]     = useState([]);
    const [selectedId,      setSelectedId]      = useState(null);
    const [messages,        setMessages]        = useState([]);
    const [input,           setInput]           = useState("");
    const [onlineUsers,     setOnlineUsers]     = useState([]);
    const [loadingList,     setLoadingList]     = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [error,           setError]           = useState(null);
    const [searchQuery,     setSearchQuery]     = useState("");
    const { clearUnread } = useNotifications();
    useEffect(() => {
     clearUnread();
    }, [clearUnread]);

    // ── Socket listeners ───────────────────────────────────────────────
    useEffect(() => {
        const socket = globalSocketRef?.current;
        if (!socket) return;

        const handleMessage = (data) => {
            console.log('✅ Message received:', data);
            setMessages(prev => [...prev, {
                id:        Date.now(),
                sender:    data.sender,
                text:      data.text,
                time:      data.time,
                videoId:   data.videoId   || null,
                clipUrl:   data.clipUrl   || null,
                reportUrl: data.reportUrl || null,
            }]);
        };

        const handleOnlineUsers = (users) => {
            console.log('👥 Online users updated:', users);
            setOnlineUsers(users.map(String));
        };

        socket.on('receive_message', handleMessage);
        socket.on('online_users',    handleOnlineUsers);
        socket.emit('get_online_users');

        return () => {
            socket.off('receive_message', handleMessage);
            socket.off('online_users',    handleOnlineUsers);
        };
    }, [globalSocketRef]);

    // ── Auto scroll ────────────────────────────────────────────────────
    useEffect(() => {
        messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Fetch contacts ─────────────────────────────────────────────────
    useEffect(() => {
        const fetchList = async () => {
            setLoadingList(true);
            try {
                const response = await getConsultantList();
                const list     = response.data || [];
                setContactList(list);
                if (list.length > 0) setSelectedId(list[0].id);
            } catch (err) {
                setError('Failed to load contacts.');
            } finally {
                setLoadingList(false);
            }
        };
        fetchList();
    }, []);

    // ── Fetch messages ─────────────────────────────────────────────────
    const fetchMessages = useCallback(async (contactId) => {
        if (!contactId) return;
        setLoadingMessages(true);
        try {
            const response = await getChatMessages(contactId);
            setMessages(response.data.messages || []);
        } catch (err) {
            console.error('Failed to load messages:', err);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    useEffect(() => {
        if (selectedId) fetchMessages(selectedId);
    }, [selectedId, fetchMessages]);

    // ── Send message ───────────────────────────────────────────────────
    const handleSend = async () => {
        if (!input.trim() || !selectedId) return;
        const text = input.trim();
        setInput("");

        const optimistic = {
            id:     Date.now(),
            sender: isConsultant ? 'Consultant' : 'Doctor',
            text,
            time:   new Date().toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit'
            }),
        };
        setMessages(prev => [...prev, optimistic]);

        try {
            await sendChatMessage(selectedId, text);
        } catch (err) {
            console.error('Send failed:', err);
        }
    };

    // ── Clear chat ─────────────────────────────────────────────────────
    const clearChat = async () => {
        if (!selectedId) return;
        if (!window.confirm('Delete all messages in this chat?')) return;
        try {
            await api.delete(`/chat/${selectedId}/clear`);
            setMessages([]);
        } catch (err) {
            console.error('Clear chat failed:', err);
        }
    };

    // ── Share case ─────────────────────────────────────────────────────
    const handleShareCase = () => {
        if (!selectedId) return;
        const recentVideoId = localStorage.getItem('lastAnalyzedVideoId');
        setInput(
            recentVideoId
                ? `I am sharing Case ID: ${recentVideoId} for your review. Please check the AI analysis report.`
                : 'I would like to share a case for your expert consultation.'
        );
    };

    // ── Helpers ────────────────────────────────────────────────────────
    const filteredContacts = contactList.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const currentContact  = contactList.find(c => c.id === selectedId) || {};
    const isContactOnline = (contactId) => onlineUsers.includes(String(contactId));
    const isOnline        = isContactOnline(selectedId);

    return (
        <Container maxWidth="xl" sx={{ py: 0, height: "calc(100vh - 80px)" }}>

            <Typography variant="h5" gutterBottom sx={{
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center'
            }}>
                {isConsultant
                    ? <><RateReview sx={{ mr: 1, color: accentColor }} /> Physician Collaboration Hub</>
                    : <><Chat       sx={{ mr: 1, color: accentColor }} /> Collaborative Consultation</>
                }
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

            <Box sx={{
                height: 'calc(100% - 48px)',
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 2
            }}>

                {/* ── LEFT: Contact List ──────────────────────────── */}
                <Box sx={{ flex: '0 0 300px', height: '100%', overflow: 'hidden' }}>
                    <Paper elevation={4} sx={{
                        height: '100%',
                        borderRadius: '12px',
                        overflow: 'hidden'
                    }}>
                        <Box sx={{ bgcolor: accentColor, p: 2 }}>
                            <Typography variant="subtitle1" fontWeight="bold" color="white">
                                {isConsultant ? 'Referring Doctors' : 'Available Consultants'}
                            </Typography>
                            <TextField
                                fullWidth size="small"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                sx={{ mt: 1, bgcolor: 'white', borderRadius: 1 }}
                                InputProps={{
                                    startAdornment: <Search sx={{ mr: 1, color: 'gray' }} />
                                }}
                            />
                        </Box>

                        {loadingList ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                <CircularProgress sx={{ color: accentColor }} />
                            </Box>
                        ) : filteredContacts.length === 0 ? (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography color="text.secondary">
                                    {isConsultant ? 'No doctors found.' : 'No consultants available.'}
                                </Typography>
                            </Box>
                        ) : (
                            <List sx={{
                                overflowY: 'auto',
                                height: 'calc(100% - 110px)',
                                p: 0
                            }}>
                                {filteredContacts.map((c) => (
                                    <ListItem
                                        key={c.id}
                                        button
                                        onClick={() => setSelectedId(c.id)}
                                        selected={selectedId === c.id}
                                        sx={{
                                            borderBottom: `1px solid ${theme.palette.divider}`,
                                            borderLeft:   selectedId === c.id
                                                ? `4px solid ${accentColor}`
                                                : '4px solid transparent',
                                            bgcolor: selectedId === c.id
                                                ? accentColor + '10'
                                                : 'transparent',
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Badge
                                                overlap="circular"
                                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                badgeContent={
                                                    <Box sx={{
                                                        width: 12, height: 12,
                                                        borderRadius: '50%',
                                                        bgcolor: isContactOnline(c.id) ? '#44b700' : '#bdbdbd',
                                                        border: '2px solid white'
                                                    }} />
                                                }
                                            >
                                                <Avatar sx={{ bgcolor: accentColor }}>
                                                    {c.name?.[0]?.toUpperCase()}
                                                </Avatar>
                                            </Badge>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography fontWeight="bold" fontSize="0.9rem">
                                                        {c.name}
                                                    </Typography>
                                                    {c.unread > 0 && (
                                                        <Chip
                                                            label={c.unread}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: accentColor,
                                                                color: 'white',
                                                                height: 18,
                                                                fontSize: '0.7rem'
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            }
                                            secondary={
                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                    {c.lastMessage}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Paper>
                </Box>

                {/* ── RIGHT: Chat Panel ───────────────────────────── */}
                <Box sx={{
                    flex: 1,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0
                }}>
                    {/* Header */}
                    <Paper elevation={3} sx={{ p: 2, mb: 1.5, borderRadius: '12px' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box display="flex" alignItems="center" gap={1.5}>
                                <Badge
                                    overlap="circular"
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                    badgeContent={
                                        <Box sx={{
                                            width: 12, height: 12,
                                            borderRadius: '50%',
                                            bgcolor: isOnline ? '#44b700' : '#bdbdbd',
                                            border: '2px solid white'
                                        }} />
                                    }
                                >
                                    <Avatar sx={{ bgcolor: accentColor, width: 40, height: 40 }}>
                                        {currentContact.name?.[0]?.toUpperCase() || '?'}
                                    </Avatar>
                                </Badge>
                                <Box>
                                    <Typography variant="h6" fontWeight="bold" color={accentColor}>
                                        {currentContact.name || 'Select a contact'}
                                    </Typography>
                                    <Typography variant="caption"
                                        sx={{ color: isOnline ? '#44b700' : 'text.secondary' }}>
                                        {isOnline ? '● Online' : '○ Offline'}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box display="flex" gap={1}>
                                <Button
                                    size="small" variant="outlined"
                                    startIcon={<Share />}
                                    onClick={handleShareCase}
                                    sx={{ color: accentColor, borderColor: accentColor + '60' }}
                                >
                                    Share Case
                                </Button>
                                <Button
                                    size="small" variant="outlined"
                                    startIcon={<DeleteOutline />}
                                    onClick={clearChat}
                                    sx={{ color: 'error.main', borderColor: '#f4433660' }}
                                >
                                    Clear Chat
                                </Button>
                                {isConsultant && (
                                    <Button
                                        size="small" variant="contained"
                                        color="success"
                                        startIcon={<AssignmentTurnedIn />}
                                    >
                                        Verify
                                    </Button>
                                )}
                            </Box>
                        </Box>
                    </Paper>

                    {/* Messages Area */}
                    <Paper elevation={4} sx={{
                        p: 2,
                        flexGrow: 1,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '12px',
                        mb: 1.5
                    }}>
                        {loadingMessages ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                <CircularProgress sx={{ color: accentColor }} />
                            </Box>
                        ) : messages.length === 0 ? (
                            <Box sx={{
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                height: '100%'
                            }}>
                                <Chat sx={{ fontSize: 60, color: accentColor + '40', mb: 2 }} />
                                <Typography color="text.secondary">
                                    No messages yet. Start the conversation!
                                </Typography>
                            </Box>
                        ) : (
                            messages.map((msg, idx) => (
                                <Message
                                    key={msg.id || idx}
                                    msg={msg}
                                    isMe={
                                        (isConsultant  && msg.sender === 'Consultant') ||
                                        (!isConsultant && msg.sender === 'Doctor')
                                    }
                                    accentColor={accentColor}
                                    theme={theme}
                                />
                            ))
                        )}
                        <div ref={messagesEnd} />
                    </Paper>

                    {/* Input */}
                    <TextField
                        fullWidth
                        placeholder={
                            selectedId
                                ? `Message ${currentContact.name || 'contact'}...`
                                : 'Select a contact first'
                        }
                        value={input}
                        disabled={!selectedId}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        sx={{
                            bgcolor: theme.palette.background.paper,
                            borderRadius: '12px'
                        }}
                        InputProps={{
                            endAdornment: (
                                <Button
                                    variant="contained"
                                    onClick={handleSend}
                                    disabled={!input.trim() || !selectedId}
                                    endIcon={<SendIcon />}
                                    sx={{
                                        bgcolor: accentColor,
                                        '&:hover': { bgcolor: accentColor },
                                        borderRadius: '8px',
                                        minWidth: 100
                                    }}
                                >
                                    {isConsultant ? 'REPLY' : 'SEND'}
                                </Button>
                            )
                        }}
                    />
                </Box>
            </Box>
        </Container>
    );
}