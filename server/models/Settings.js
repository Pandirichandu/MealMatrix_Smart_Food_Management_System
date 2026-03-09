const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    academicSession: {
        type: String,
        required: true,
        default: '2025-2026'
    },
    mealBookingCutoffHours: {
        type: Number,
        required: true,
        default: 4 // Default 4 hours before meal time
    },
    mealCutoffTimes: {
        breakfast: {
            dayOffset: { type: Number, default: -1 },
            time: { type: String, default: "22:30" }
        },
        lunch: {
            dayOffset: { type: Number, default: 0 },
            time: { type: String, default: "09:30" }
        },
        dinner: {
            dayOffset: { type: Number, default: 0 },
            time: { type: String, default: "14:30" }
        }
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Settings', SettingsSchema);
