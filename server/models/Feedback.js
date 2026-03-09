const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
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
        default: Date.now
    },
    mealType: {
        type: String,
        enum: ['breakfast', 'lunch', 'dinner'],
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    comment: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Optimization for Aggregation
FeedbackSchema.index({ hostelId: 1, rating: 1 });
FeedbackSchema.index({ hostelId: 1, mealType: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', FeedbackSchema);
