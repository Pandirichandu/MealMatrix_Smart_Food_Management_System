const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'owner', 'student', 'customer'],
        default: 'student'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    isFirstLogin: {
        type: Boolean,
        default: true
    },
    // For Students and Owners
    hostelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hostel'
    },
    // Specific to Students
    studentId: {
        type: String, // e.g., Roll number
        unique: true,
        sparse: true // Only unique if present
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
});

// Improve performance for counting students by hostel
UserSchema.index({ hostelId: 1 });

module.exports = mongoose.model('User', UserSchema);
