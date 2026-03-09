const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // Ensure correct path to .env if needed
const MealBooking = require('../server/models/MealBooking');
const User = require('../server/models/User');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mealmatrix';

async function verifyDb() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("Connected.");

        console.log("\n--- VERIFYING SCHEMA REAL DATA ---");

        // Find one user who is a student
        const student = await User.findOne({ role: 'student' });
        if (student) {
            console.log("Found Student:");
            console.log(`- _id Type: ${typeof student._id}, value: ${student._id}`);
            console.log(`- studentId Type: ${typeof student.studentId}, value: ${student.studentId}`);
        } else {
            console.log("No students found in DB.");
        }

        // Find one MealBooking
        const booking = await MealBooking.findOne({});
        if (booking) {
            console.log("\nFound Booking:");
            console.log(`- studentId Type in DB: ${typeof booking.studentId}, value: ${booking.studentId}, isObjectId: ${mongoose.isValidObjectId(booking.studentId)}`);
            console.log(`- hostelId Type in DB: ${typeof booking.hostelId}, value: ${booking.hostelId}, isObjectId: ${mongoose.isValidObjectId(booking.hostelId)}`);
            console.log(`- date Type in DB: ${typeof booking.date}, value: ${booking.date}`);
            console.log(`- mealType: ${booking.mealType}`);

            // Check if studentId is basically the ObjectId referenced from User
            if (student && booking.studentId.toString() === student._id.toString()) {
                console.log("VERIFIED: MealBooking studentId matches User._id precisely.");
            }
        } else {
            console.log("No MealBookings found in DB.");
        }

    } catch (e) {
        console.error("DB Script Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}

verifyDb();
