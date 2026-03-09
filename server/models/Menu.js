const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
    foodName: { type: String, required: true },
    imageUrl: { type: String, required: true },
    category: { type: String },
    vegOrNonVeg: { type: String, enum: ['veg', 'non-veg'], required: true },
    price: { type: Number, default: 0 },
    isCustomDish: { type: Boolean, default: false },
    mealType: { type: String }, // Added for strict filtering
    maxQuantity: { type: Number, default: 1 } // Per-student limit
});

const MenuSchema = new mongoose.Schema({
    hostelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hostel',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    category: {
        type: String,
        enum: ['Main', 'Special', 'Side', 'Beverage', 'Desert'],
        default: 'Main'
    },
    status: {
        type: String,
        enum: ['DRAFT', 'PUBLISHED'],
        default: 'DRAFT'
    },
    mealType: {
        type: String,
        enum: ['breakfast', 'lunch', 'dinner', 'Breakfast', 'Lunch', 'Dinner'], // Support both cases to be safe
        required: true
    },
    maxDishesPerStudent: {
        type: Number,
        default: null // null means no limit
    },
    vegItems: [MenuItemSchema],
    nonVegItems: [MenuItemSchema],
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Ensure one menu per meal type per day per hostel
MenuSchema.index({ hostelId: 1, date: 1, mealType: 1 }, { unique: true });

module.exports = mongoose.model('Menu', MenuSchema);
