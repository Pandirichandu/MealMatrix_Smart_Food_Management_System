/* eslint-disable @typescript-eslint/no-require-imports */
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./server/models/User');
const MealBooking = require('./server/models/MealBooking');
const FoodItem = require('./server/models/FoodItem');
const Hostel = require('./server/models/Hostel');

async function checkData() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/mealmatrix', { serverSelectionTimeoutMS: 5000 });
        console.log("Connected to DB mealmatrix.");

        const owner = await User.findOne({ role: 'owner' });
        if (!owner) {
            console.log("No owner found.");
            process.exit(0);
        }
        console.log(`Found Owner: ${owner.email}, HostelID: ${owner.hostelId}`);

        const allBookings = await MealBooking.countDocuments({});
        console.log(`Total Bookings in DB: ${allBookings}`);

        const ownerBookings = await MealBooking.countDocuments({ hostelId: owner.hostelId });
        console.log(`Total Bookings for Owner Hostel: ${ownerBookings}`);

        if (ownerBookings > 0) {
            const sampleBookings = await MealBooking.find({ hostelId: owner.hostelId }).limit(3);
            console.log("Sample Bookings:", JSON.stringify(sampleBookings, null, 2));

            for (const b of sampleBookings) {
                if (b.items && b.items.length > 0) {
                    const itemName = b.items[0].itemName;
                    const foodMatch = await FoodItem.findOne({ foodName: itemName });
                    console.log(`Looking up FoodItem with foodName: "${itemName}"`);
                    console.log("FoodItem match found:", foodMatch ? "YES, Price: " + foodMatch.price : "NO");
                }
            }
        }
    } catch (err) {
        console.error("Script Error:", err.message);
    } finally {
        mongoose.disconnect();
    }
}

checkData();
