const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const connectDB = require('./config/db');

const authRoutes        = require('./routes/authRoutes');
const videoRoutes       = require('./routes/videoRoutes');
const resultRoutes      = require('./routes/resultRoutes');
const reportRoutes      = require('./routes/reportRoutes');
const userRoutes        = require('./routes/userRoutes');
const adminRoutes       = require('./routes/adminRoutes');
const consultantRoutes  = require('./routes/consultantRoutes');
const chatRoutes        = require('./routes/chatRoutes');
const analysisRoutes    = require('./routes/analysisRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); // ✅ add

const PORT = process.env.PORT || 5000;

connectDB();

const app    = express();
const server = http.createServer(app);

// ── Socket.IO Setup ───────────────────────────────────────────────────
const io = new Server(server, {
    cors: {
        origin:  'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});

const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // User registers their ID
    socket.on('user_connected', (userId) => {
        const id = String(userId);
        onlineUsers.set(id, socket.id);
        console.log(`User ${id} is online. Total online: ${onlineUsers.size}`);
        io.emit('online_users', Array.from(onlineUsers.keys()));
    });

    // ✅ NEW — send current online users to whoever asks
    socket.on('get_online_users', () => {
        socket.emit('online_users', Array.from(onlineUsers.keys()));
    });

    // Handle direct message via socket
    socket.on('send_message', (data) => {
        const receiverSocketId = onlineUsers.get(String(data.receiverId));
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('receive_message', data);
        }
        socket.emit('message_sent', data);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        for (const [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                onlineUsers.delete(userId);
                console.log(`User ${userId} went offline`);
                break;
            }
        }
        io.emit('online_users', Array.from(onlineUsers.keys()));
    });
});

app.set('io', io);
app.set('onlineUsers', onlineUsers);

// ── Middleware ────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── API Routes ────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/video',       videoRoutes);
app.use('/api/results',     resultRoutes);
app.use('/api/reports',     reportRoutes);
app.use('/api/user',        userRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/consultant',  consultantRoutes);
app.use('/api/chat',        chatRoutes);
app.use('/api/analysis',    analysisRoutes);
app.use('/api/dashboard', dashboardRoutes); // ✅ add

app.get('/', (req, res) => {
    res.json({ message: 'MedVid API is running!' });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));