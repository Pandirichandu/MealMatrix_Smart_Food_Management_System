const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        immutable: true,
        trim: true
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        immutable: true
    },
    targetHostel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hostel',
        immutable: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        immutable: true
    },
    ipAddress: {
        type: String,
        immutable: true
    },
    userAgent: {
        type: String,
        immutable: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        immutable: true,
        index: true
    }
});

// Indexes for performance
AuditLogSchema.index({ timestamp: -1, action: 1 });
AuditLogSchema.index({ performedBy: 1, timestamp: -1 });
AuditLogSchema.index({ action: 'text' }); // Text index for broad searches

module.exports = mongoose.model('AuditLog', AuditLogSchema);

