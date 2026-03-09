const mongoose = require('mongoose');

const PilotReportSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    hostelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hostel'
    },
    usersTesterCount: {
        type: Number,
        required: true
    },
    durationDays: {
        type: Number,
        required: true
    },
    issuesFound: {
        type: String // Detailed text or stringified JSON
    },
    improvements: {
        type: String
    },
    successRate: {
        type: Number, // Percentage 0-100
        required: true
    },
    userFeedback: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('PilotReport', PilotReportSchema);
