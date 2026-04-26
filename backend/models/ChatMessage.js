const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    videoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
        default: null
    },
    message:   { type: String,  required: true },
    isRead:    { type: Boolean, default: false },
    sentAt:    { type: Date,    default: Date.now },
    clipUrl:   { type: String,  default: null },  // ✅
    reportUrl: { type: String,  default: null },  // ✅
});

module.exports = mongoose.models.ChatMessage ||
                 mongoose.model('ChatMessage', ChatMessageSchema);