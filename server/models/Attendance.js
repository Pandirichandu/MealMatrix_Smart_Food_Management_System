const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    hostelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hostel',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    mealType: {
        type: String,
        enum: ['breakfast', 'lunch', 'dinner'],
        required: true
    },
    scannedAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure a student can only scan once per meal type per day
// Ensure a student can only scan once per meal type per day
AttendanceSchema.index({ studentId: 1, date: 1, mealType: 1 }, { unique: true });
AttendanceSchema.index({ hostelId: 1, date: 1, mealType: 1 }); // Optimized for Attendance Query

module.exports = mongoose.model('Attendance', AttendanceSchema);
