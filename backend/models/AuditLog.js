const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        default: null 
    },
    action: { type: String, required: true },  // e.g. 'LOGIN', 'UPLOAD', 'DELETE'
    entity: { type: String, default: null },   // e.g. 'Video', 'User', 'Report'
    entityId: { type: String, default: null }, // ID of affected document
    details: { type: String, default: null },  // extra info
    ipAddress: { type: String, default: null },
    status: { 
        type: String, 
        enum: ['success', 'failed'], 
        default: 'success' 
    },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

