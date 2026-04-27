import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNotifications } from "../context/NotificationContext";
import {
    Container, Typography, Paper, TextField, Button, Box, useTheme,
    Chip, List, ListItem, ListItemText, ListItemAvatar, Avatar,
    Badge, CircularProgress, Alert, Dialog, DialogTitle,
    DialogContent, DialogActions, Snackbar
} from "@mui/material";
import {
    Send as SendIcon, Share, RateReview,
    Search, Chat, DeleteOutline
} from "@mui/icons-material";
import {
    getConsultantList,
    getChatMessages,
    sendChatMessage,
    getHistory,
    getResults
} from "../services/api";
import api from "../services/api";
import { useSocket, useSocketReady } from "../App";

// ── Message Bubble ─────────────────────────────────────────────────────
const Message = ({ msg, isMe, accentColor, theme }) => {

    const handleDownloadReport = async () => {
        try {
            const response = await api.get(msg.reportUrl, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a   = document.createElement('a');
            a.href     = url;
            a.download = 'MedVid-Report.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            // toast is handled by parent via onError prop
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
    const socketReady     = useSocketReady();
    const selectedIdRef   = useRef(null);

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
    const [clearDialog,     setClearDialog]     = useState(false);
    const [toast,           setToast]           = useState({ open: false, message: '', severity: 'success' });
    const [shareCaseDialog, setShareCaseDialog] = useState(false);
    const [caseList,        setCaseList]        = useState([]);
    const [loadingCases,    setLoadingCases]    = useState(false);
    const [sendingCase,     setSendingCase]     = useState(false);
    const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });
    const closeToast = () => setToast(t => ({ ...t, open: false }));
    const { clearUnread } = useNotifications();
    useEffect(() => {
     clearUnread();
    }, [clearUnread]);

    useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

    // ── Socket listeners ───────────────────────────────────────────────
    useEffect(() => {
        const socket = globalSocketRef?.current;
        if (!socket) return;

        const handleMessage = (data) => {
            const fromSelected = data.senderId
                ? String(data.senderId) === String(selectedIdRef.current)
                : true; // fallback: no senderId, treat as current contact

            if (fromSelected) {
                setMessages(prev => [...prev, {
                    id:        Date.now(),
                    sender:    data.sender,
                    text:      data.text,
                    time:      data.time,
                    videoId:   data.videoId   || null,
                    clipUrl:   data.clipUrl   || null,
                    reportUrl: data.reportUrl || null,
                }]);
            }

            // Keep contact list fresh: last message preview + unread count
            if (data.senderId) {
                setContactList(prev => prev.map(c =>
                    String(c.id) === String(data.senderId)
                        ? {
                            ...c,
                            lastMessage: data.text,
                            unread: fromSelected ? c.unread : (c.unread || 0) + 1,
                          }
                        : c
                ));
            }
        };

        const handleOnlineUsers = (users) => {
            setOnlineUsers(users.map(String));
        };

        socket.on('receive_message', handleMessage);
        socket.on('online_users',    handleOnlineUsers);
        socket.emit('get_online_users');

        return () => {
            socket.off('receive_message', handleMessage);
            socket.off('online_users',    handleOnlineUsers);
        };
    }, [globalSocketRef, socketReady]);

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
        if (selectedId) {
            fetchMessages(selectedId);
            setContactList(prev => prev.map(c =>
                c.id === selectedId ? { ...c, unread: 0 } : c
            ));
        }
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
            time:   new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, optimistic]);
        setContactList(prev => prev.map(c =>
            c.id === selectedId ? { ...c, lastMessage: text } : c
        ));

        try {
            await sendChatMessage(selectedId, text);
        } catch (err) {
            console.error('Send failed:', err);
        }
    };

    // ── Clear chat ─────────────────────────────────────────────────────
    const clearChat = async () => {
        try {
            await api.delete(`/chat/${selectedId}/clear`);
            setMessages([]);
            setClearDialog(false);
            showToast('Chat cleared.');
        } catch {
            showToast('Failed to clear chat.', 'error');
        }
    };

    // ── Share case ─────────────────────────────────────────────────────
    const handleShareCase = async () => {
        if (!selectedId) return;

        if (isConsultant) {
            setInput('I have reviewed the case findings. Please let me know if you need further consultation or additional information.');
            return;
        }

        setShareCaseDialog(true);
        setLoadingCases(true);
        try {
            const res = await getHistory({ pageSize: 50 });
            setCaseList(res.data.items || []);
        } catch {
            setCaseList([]);
        } finally {
            setLoadingCases(false);
        }
    };

    const handleCaseSelect = async (caseItem) => {
        setShareCaseDialog(false);
        setSendingCase(true);
        try {
            const res    = await getResults(String(caseItem.videoId));
            const result = res.data;

            const openingMessage =
                `CASE REFERRAL REQUEST\n\n` +
                `Patient: ${result.patientName}\n` +
                `Age: ${result.patientAge} | Gender: ${result.patientGender}\n\n` +
                `AI Finding: ${result.detections?.[0]?.type || 'N/A'}\n` +
                `Severity: ${result.topSeverity}\n` +
                `Confidence: ${((result.detections?.[0]?.confidence || 0) * 100).toFixed(1)}%\n\n` +
                `Summary: ${result.reportSummary}\n\n` +
                `Case ID: ${result.videoId}`;

            await api.post('/chat/start', {
                consultantId: selectedId,
                videoId:      String(result.videoId),
                clipUrl:      result.clipUrl || null,
                message:      openingMessage,
            });

            await fetchMessages(selectedId);
            setContactList(prev => prev.map(c =>
                c.id === selectedId ? { ...c, lastMessage: 'CASE REFERRAL REQUEST' } : c
            ));
            showToast('Case shared successfully.');
        } catch {
            showToast('Failed to share case. Please try again.', 'error');
        } finally {
            setSendingCase(false);
        }
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
                                sx={{
                                    mt: 1, bgcolor: 'white', borderRadius: 1,
                                    '& .MuiInputBase-input': { color: '#2E2E2E' },
                                    '& .MuiInputBase-input::placeholder': { color: 'gray', opacity: 1 },
                                }}
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
                                overflowX: 'hidden',
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
                                {!isConsultant && (
                                    <Button
                                        size="small" variant="outlined"
                                        startIcon={sendingCase ? <CircularProgress size={14} sx={{ color: accentColor }} /> : <Share />}
                                        onClick={handleShareCase}
                                        disabled={sendingCase}
                                        sx={{ color: accentColor, borderColor: accentColor + '60' }}
                                    >
                                        {sendingCase ? 'Sharing...' : 'Share Case'}
                                    </Button>
                                )}
                                <Button
                                    size="small" variant="outlined"
                                    startIcon={<DeleteOutline />}
                                    onClick={() => setClearDialog(true)}
                                    sx={{ color: 'error.main', borderColor: '#f4433660' }}
                                >
                                    Clear Chat
                                </Button>
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

            {/* Share Case Dialog (Doctor only) */}
            <Dialog open={shareCaseDialog} onClose={() => setShareCaseDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ color: accentColor }}>Select a Case to Share</DialogTitle>
                <DialogContent>
                    {loadingCases ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress sx={{ color: accentColor }} />
                        </Box>
                    ) : caseList.length === 0 ? (
                        <Typography color="text.secondary" sx={{ p: 1 }}>
                            No analyses found. Run an analysis first.
                        </Typography>
                    ) : (
                        <List sx={{ pt: 0 }}>
                            {caseList.map((c) => (
                                <ListItem
                                    key={c.videoId}
                                    button
                                    onClick={() => handleCaseSelect(c)}
                                    sx={{
                                        borderRadius: '8px', mb: 0.5,
                                        '&:hover': { bgcolor: accentColor + '15' }
                                    }}
                                >
                                    <ListItemAvatar>
                                        <Avatar sx={{
                                            bgcolor: c.topSeverity === 'High'
                                                ? 'error.main'
                                                : c.topSeverity === 'Medium'
                                                    ? 'warning.main'
                                                    : 'success.main'
                                        }}>
                                            {c.patientName?.[0]?.toUpperCase()}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={<Typography fontWeight="bold">{c.patientName}</Typography>}
                                        secondary={`Severity: ${c.topSeverity} · ${new Date(c.uploadedAt).toLocaleDateString()}`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShareCaseDialog(false)}>Cancel</Button>
                </DialogActions>
            </Dialog>

            {/* Clear Chat Dialog */}
            <Dialog open={clearDialog} onClose={() => setClearDialog(false)}>
                <DialogTitle sx={{ color: 'error.main' }}>Clear Chat</DialogTitle>
                <DialogContent>
                    <Typography>Delete all messages with <strong>{currentContact.name || 'this contact'}</strong>? This cannot be undone.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setClearDialog(false)}>Cancel</Button>
                    <Button onClick={clearChat} variant="contained" color="error" startIcon={<DeleteOutline />}>Delete</Button>
                </DialogActions>
            </Dialog>

            {/* Toast */}
            <Snackbar open={toast.open} autoHideDuration={3000} onClose={closeToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={closeToast} severity={toast.severity} sx={{ width: '100%' }}>{toast.message}</Alert>
            </Snackbar>

        </Container>
    );
}