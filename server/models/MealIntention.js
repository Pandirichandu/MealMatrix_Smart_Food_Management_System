const mongoose = require('mongoose');

const MealIntentionSchema = new mongoose.Schema({
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
    status: {
        type: String,
        enum: ['present', 'not_coming'],
        required: true
    }
}, { timestamps: true });

// Ensure unique combination per student, date, and meal type
MealIntentionSchema.index({ studentId: 1, date: 1, mealType: 1 }, { unique: true });

// Index for owner queries counting intentions by date and mealType per hostel
MealIntentionSchema.index({ hostelId: 1, date: 1, mealType: 1 });

module.exports = mongoose.model('MealIntention', MealIntentionSchema);
