const mongoose = require('../server/node_modules/mongoose');
const path = require('path');
const fs = require('fs');

// Manual Env Parsing
try {
    const envPath = path.join(__dirname, '../server/.env');
    if (fs.existsSync(envPath)) {
        const envFile = fs.readFileSync(envPath, 'utf8');
        envFile.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
    } else {
        const envPath2 = path.join(__dirname, '../.env');
        const envFile = fs.readFileSync(envPath2, 'utf8');
        envFile.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
    }
} catch (e) {
    console.error("Warning: Could not read .env file manually", e);
}

const User = require('../server/models/User');
const MealBooking = require('../server/models/MealBooking');

async function verifyScan() {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI not found");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    // 1. Find any student & owner to test
    const student = await User.findOne({ role: 'student' });
    const owner = await User.findOne({ role: 'owner' });

    if (!student || !owner) {
        console.log("No student or owner found in DB to perform test.");
        await mongoose.disconnect();
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);

    // Create a mock booking for "breakfast"
    const mockBooking = new MealBooking({
        studentId: student._id,
        hostelId: owner.hostelId || new mongoose.Types.ObjectId(), // Fallback if no hostelId
        date: new Date(today.toISOString()), // normalized
        mealType: 'breakfast',
        items: [{ itemName: 'Test Food', quantity: 1, price: 50 }],
        status: 'active'
    });

    await mockBooking.save();

    const studentId = student._id;
    const hostelId = mockBooking.hostelId;

    // Simulate detecting "breakfast"
    const detectedMealType = 'breakfast';

    console.log(`\nSimulating scan for student ${studentId} at ${detectedMealType} time...`);
    console.log("Detected mealType:", detectedMealType);
    console.log("Today start:", today);
    console.log("Tomorrow:", tomorrow);
    console.log("Student _id:", studentId);
    console.log("Owner hostelId:", hostelId);

    // 4. Query Booking strictly for the detected mealType (using our new fix)
    const bookingQuery = {
        studentId: studentId,
        hostelId: new mongoose.Types.ObjectId(hostelId),
        mealType: { $regex: new RegExp(`^${detectedMealType}$`, "i") },
        date: {
            $gte: new Date(today.toISOString()),
            $lt: new Date(tomorrow.toISOString())
        }
    };

    const booking = await MealBooking.findOne(bookingQuery);

    if (booking) {
        console.log("\nBOOKING FOUND");
    } else {
        console.log("\nBOOKING NOT FOUND");
    }

    // Clean up
    await MealBooking.deleteOne({ _id: mockBooking._id });
    console.log("\nCleaned up mock booking.");

    await mongoose.disconnect();
}

verifyScan().catch(err => {
    console.error(err);
    mongoose.disconnect();
});
