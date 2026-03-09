const mongoose = require('mongoose');

const MealSelectionSchema = new mongoose.Schema({
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
    breakfast: {
        status: { type: String, enum: ['opt-in', 'opt-out', 'pending'], default: 'pending' },
        diet: { type: String, enum: ['veg', 'non-veg'], default: null },
        selectedItems: [
            {
                dishId: String,
                dishName: String,
                quantity: { type: Number, default: 1 }
            }
        ]
    },
    lunch: {
        status: { type: String, enum: ['opt-in', 'opt-out', 'pending'], default: 'pending' },
        diet: { type: String, enum: ['veg', 'non-veg'], default: null },
        selectedItems: [
            {
                dishId: String,
                dishName: String,
                quantity: { type: Number, default: 1 }
            }
        ]
    },
    dinner: {
        status: { type: String, enum: ['opt-in', 'opt-out', 'pending'], default: 'pending' },
        diet: { type: String, enum: ['veg', 'non-veg'], default: null },
        selectedItems: [
            {
                dishId: String,
                dishName: String,
                quantity: { type: Number, default: 1 }
            }
        ]
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// One selection record per student per day
MealSelectionSchema.index({ studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('MealSelection', MealSelectionSchema);
