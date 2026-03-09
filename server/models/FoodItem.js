const mongoose = require('mongoose');

const FoodItemSchema = new mongoose.Schema({
    foodName: {
        type: String,
        required: true,
        trim: true
    },
    normalizedName: {
        type: String,
        lowercase: true,
        trim: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Main', 'Rice', 'Breads', 'Beverages', 'Dessert', 'Snacks'],
        default: 'Main'
    },
    vegOrNonVeg: {
        type: String,
        required: true,
        enum: ['veg', 'non-veg'],
        default: 'veg'
    },
    price: {
        type: Number,
        default: 0
    },
    isCustomDish: {
        type: Boolean,
        default: false
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null // null means global/seeded item
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for fast search
FoodItemSchema.index({ foodName: 'text', normalizedName: 1 });

module.exports = mongoose.model('FoodItem', FoodItemSchema);
