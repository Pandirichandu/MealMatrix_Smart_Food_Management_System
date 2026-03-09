const mongoose = require('mongoose');

const MealBookingSchema = new mongoose.Schema({
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
    items: [
        {
            itemName: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 },
            dishId: { type: String } // Optional reference
        }
    ],
    bookingType: {
        type: String,
        enum: ['advance', 'late', 'closed'],
        default: 'advance'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient querying and uniqueness
MealBookingSchema.index({ studentId: 1, date: 1, mealType: 1 }, { unique: true });
// Index for efficient querying and uniqueness

MealBookingSchema.index({ date: 1, hostelId: 1 });
MealBookingSchema.index({ hostelId: 1, date: 1, mealType: 1 }); // Optimized for Attendance Query

module.exports = mongoose.model('MealBooking', MealBookingSchema);
