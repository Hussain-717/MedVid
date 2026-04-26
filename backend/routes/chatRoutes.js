const express = require('express');
const router  = express.Router();
const {
    getConsultants,
    getMessages,
    sendMessage,
    getUnreadCount,
    deleteChat,
    startChat      // ✅ new
} = require('../controllers/chatController');
const { protect } = require('../middleware/authmiddleware');

router.get('/consultants',              protect, getConsultants);
router.get('/unread',                   protect, getUnreadCount);
router.post('/start',                   protect, startChat);        // ✅ new
router.get('/:consultantId/messages',   protect, getMessages);
router.post('/:consultantId/send',      protect, sendMessage);
router.delete('/:contactId/clear',      protect, deleteChat);

module.exports = router;