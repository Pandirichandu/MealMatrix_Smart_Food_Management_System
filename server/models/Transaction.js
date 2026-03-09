const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['credit', 'debit'], // credit = recharge, debit = meal cost
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['internal', 'upi', 'cash', 'card'],
        default: 'internal'
    },
    gatewayTransactionId: {
        type: String
    },
    description: {
        type: String
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
