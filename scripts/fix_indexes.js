const mongoose = require('mongoose');
const MealBooking = require('../server/models/MealBooking');
const Attendance = require('../server/models/Attendance');
require('dotenv').config();

async function fixIndexes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000
        });
        console.log('Connected to MongoDB');

        console.log('Syncing indexes for MealBooking...');
        await MealBooking.syncIndexes();
        console.log('Synced MealBooking indexes.');

        console.log('Syncing indexes for Attendance...');
        await Attendance.syncIndexes();
        console.log('Synced Attendance indexes.');

        console.log('Done.');
        await mongoose.disconnect();
        process.exit(0);

    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

fixIndexes();
