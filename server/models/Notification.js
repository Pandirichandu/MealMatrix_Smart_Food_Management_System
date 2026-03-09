const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    hostelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hostel',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: [
            'MENU_UPDATE',
            'MEAL_REMINDER',
            'MEAL_CLOSED',
            'ATTENDANCE_CONFIRMED',
            'MISSED_MEAL',
            'ANNOUNCEMENT',
            'INFO'
        ],
        default: 'INFO',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    // Optional: For linking to specific resources or deduplication
    relatedId: {
        type: String, // Can be ObjectId or string key like "2026-02-09-LUNCH"
        default: null
    },
    // Optional: Frontend route path for redirection when clicked
    link: {
        type: String,
        required: false
    },
    metadata: {
        type: Map,
        of: String,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 604800 // Optional: Auto-delete after 7 days (TTL index)
    }
});

// Index for fetching user's latest notifications specifically
NotificationSchema.index({ userId: 1, createdAt: -1 });

// Index for deduplication checks (e.g., find one by userId + relatedId)
NotificationSchema.index({ userId: 1, relatedId: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
