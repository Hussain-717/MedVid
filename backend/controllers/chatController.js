const ChatMessage = require('../models/ChatMessage');
const User        = require('../models/User');

// GET /api/chat/consultants
const getConsultants = async (req, res) => {
    try {
        const targetRole = req.user.role === 'Consultant' ? 'Doctor' : 'Consultant';
        const contacts   = await User.find({ role: targetRole, status: { $nin: ['pending', 'rejected'] } })
            .select('name email designation affiliation');

        const enriched = await Promise.all(contacts.map(async (c) => {
            const lastMsg = await ChatMessage.findOne({
                $or: [
                    { senderId: req.user.id, receiverId: c._id },
                    { senderId: c._id,       receiverId: req.user.id }
                ]
            }).sort({ sentAt: -1 });

            const unread = await ChatMessage.countDocuments({
                senderId:   c._id,
                receiverId: req.user.id,
                isRead:     false
            });

            return {
                id:          c._id,
                name:        c.name,
                email:       c.email,
                specialty:   c.designation || targetRole,
                lastMessage: lastMsg?.message || 'No messages yet',
                lastActive:  lastMsg?.sentAt
                    ? new Date(lastMsg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Never',
                unread,
            };
        }));

        res.status(200).json({ total: enriched.length, consultants: enriched });
    } catch (err) {
        console.error('Get consultants error:', err.message);
        res.status(500).json({ message: 'Server error fetching consultants.' });
    }
};

// GET /api/chat/:consultantId/messages
const getMessages = async (req, res) => {
    try {
        const { consultantId } = req.params;

        const messages = await ChatMessage.find({
            $or: [
                { senderId: req.user.id, receiverId: consultantId },
                { senderId: consultantId, receiverId: req.user.id }
            ]
        })
        .populate('senderId',  'name role')
        .populate('receiverId','name role')
        .sort({ sentAt: 1 });

        await ChatMessage.updateMany(
            { senderId: consultantId, receiverId: req.user.id, isRead: false },
            { isRead: true }
        );

        const formatted = messages.map(m => ({
            id:        m._id,
            sender:    m.senderId.role === 'Consultant' ? 'Consultant' : 'Doctor',
            text:      m.message,
            time:      new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sentAt:    m.sentAt,
            videoId:   m.videoId   || null,
            clipUrl:   m.clipUrl   || null,   // ✅
            reportUrl: m.reportUrl || null,   // ✅
            isRead:    m.isRead,
        }));

        res.status(200).json({ total: formatted.length, messages: formatted });
    } catch (err) {
        console.error('Get messages error:', err.message);
        res.status(500).json({ message: 'Server error fetching messages.' });
    }
};

// POST /api/chat/:consultantId/send
const sendMessage = async (req, res) => {
    try {
        const { consultantId } = req.params;
        const { message, videoId } = req.body;

        if (!message) {
            return res.status(400).json({ message: 'Message text is required.' });
        }

        const receiver = await User.findById(consultantId);
        if (!receiver) {
            return res.status(404).json({ message: 'Consultant not found.' });
        }

        const newMessage = await ChatMessage.create({
            senderId:   req.user.id,
            receiverId: consultantId,
            videoId:    videoId || null,
            message,
        });

        await newMessage.populate('senderId',  'name role');
        await newMessage.populate('receiverId','name role');

        const io               = req.app.get('io');
        const onlineUsers      = req.app.get('onlineUsers');
        const receiverSocketId = onlineUsers.get(String(consultantId));

        const socketPayload = {
            id:         newMessage._id,
            sender:     newMessage.senderId.role === 'Consultant' ? 'Consultant' : 'Doctor',
            senderName: newMessage.senderId.name,
            senderId:   req.user.id,
            receiverId: consultantId,
            text:       message,
            time:       new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            videoId:    videoId || null,
            clipUrl:    null,
            reportUrl:  null,
        };

        if (receiverSocketId) {
            io.to(receiverSocketId).emit('receive_message', socketPayload);
        }

        res.status(201).json({ message: 'Message sent.', data: socketPayload });
    } catch (err) {
        console.error('Send message error:', err.message);
        res.status(500).json({ message: 'Server error sending message.' });
    }
};

// GET /api/chat/unread
const getUnreadCount = async (req, res) => {
    try {
        const count = await ChatMessage.countDocuments({
            receiverId: req.user.id,
            isRead:     false
        });
        res.status(200).json({ unreadCount: count });
    } catch (err) {
        console.error('Get unread count error:', err.message);
        res.status(500).json({ message: 'Server error fetching unread count.' });
    }
};

// DELETE /api/chat/:contactId/clear
const deleteChat = async (req, res) => {
    try {
        const { contactId } = req.params;
        await ChatMessage.deleteMany({
            $or: [
                { senderId: req.user.id, receiverId: contactId },
                { senderId: contactId,   receiverId: req.user.id }
            ]
        });
        res.status(200).json({ message: 'Chat cleared successfully.' });
    } catch (err) {
        console.error('Delete chat error:', err.message);
        res.status(500).json({ message: 'Server error clearing chat.' });
    }
};

// POST /api/chat/start
const startChat = async (req, res) => {
    try {
        const { consultantId, videoId, message, clipUrl, reportUrl } = req.body;

        if (!consultantId) {
            return res.status(400).json({ message: 'Consultant ID is required.' });
        }

        const consultant = await User.findById(consultantId);
        if (!consultant) {
            return res.status(404).json({ message: 'Consultant not found.' });
        }

        const openingMessage = await ChatMessage.create({
            senderId:   req.user.id,
            receiverId: consultantId,
            videoId:    videoId   || null,
            clipUrl:    clipUrl   || null,   // ✅ saved
            reportUrl:  reportUrl || null,   // ✅ saved
            message:    message   || 'I would like to discuss this case with you.',
        });

        await openingMessage.populate('senderId',  'name role');
        await openingMessage.populate('receiverId','name role');

        const io               = req.app.get('io');
        const onlineUsers      = req.app.get('onlineUsers');
        const receiverSocketId = onlineUsers.get(String(consultantId));

        const socketPayload = {
            id:         openingMessage._id,
            sender:     'Doctor',
            senderName: openingMessage.senderId.name,
            senderId:   String(req.user.id),
            receiverId: String(consultantId),
            text:       openingMessage.message,
            time:       new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            videoId:    videoId   || null,
            clipUrl:    clipUrl   || null,   // ✅ sent via socket
            reportUrl:  reportUrl || null,   // ✅ sent via socket
        };

        if (receiverSocketId) {
            io.to(receiverSocketId).emit('receive_message', socketPayload);
        }

        res.status(201).json({
            success:     true,
            consultantId,
            messageId:   openingMessage._id,
            message:     'Chat initiated successfully.',
        });

    } catch (err) {
        console.error('Start chat error:', err.message);
        res.status(500).json({ message: 'Server error starting chat.' });
    }
};

module.exports = {
    getConsultants,
    getMessages,
    sendMessage,
    getUnreadCount,
    deleteChat,
    startChat
};