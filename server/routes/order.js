const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');

// @route   POST api/order
// @desc    Place an order
// @access  Private (Student/Customer)
router.post('/', auth, async (req, res) => {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ msg: 'No items in order' });
    }

    try {
        let totalAmount = 0;
        for (const item of items) {
            if (!item.price || !item.qty) {
                return res.status(400).json({ msg: 'Invalid item format' });
            }
            totalAmount += item.price * item.qty;
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // BALANCE CHECK REMOVED

        // Create Order
        const order = new Order({
            userId: req.user.id,
            items,
            totalAmount,
            status: 'completed'
        });
        await order.save();

        // Log Transaction (Record only)
        const transaction = new Transaction({
            studentId: req.user.id,
            amount: totalAmount,
            type: 'debit',
            description: `Order #${order._id.toString().slice(-6)}`
        });
        await transaction.save();

        res.json({ msg: 'Order placed successfully', order });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/order/history
// @desc    Get order history
// @access  Private
router.get('/history', auth, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.id }).sort({ date: -1 });
        res.json(orders);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
