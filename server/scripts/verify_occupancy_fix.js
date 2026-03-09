const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); // Adjusted path since script is in server/scripts and .env is in root
const mongoose = require('mongoose');
const User = require('../models/User');
const Hostel = require('../models/Hostel');

const verifyOccupancy = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // 1. Create Test Hostel
        const hostel = new Hostel({
            name: "Occupancy Test Hostel",
            location: "Test Loc",
            totalRooms: 10,
            ownerId: null
        });
        await hostel.save();
        console.log(`Created Hostel: ${hostel._id}`);

        // 2. Add 2 Students
        const s1 = new User({
            name: "Occ Test 1",
            email: `occ1_${Date.now()}@test.com`,
            password: "123",
            role: "student",
            studentId: `OCC1_${Date.now()}`,
            hostelId: hostel._id
        });
        await s1.save();

        const s2 = new User({
            name: "Occ Test 2",
            email: `occ2_${Date.now()}@test.com`,
            password: "123",
            role: "student",
            studentId: `OCC2_${Date.now()}`,
            hostelId: hostel._id
        });
        await s2.save();

        console.log("Added 2 students.");

        // 3. Verify Count Logic (Same as Route)
        const occupied = await User.countDocuments({ role: 'student', hostelId: hostel._id });
        console.log(`Occupancy Count: ${occupied}`);

        if (occupied === 2) {
            console.log("✅ SUCCESS: Occupancy count is correct.");
        } else {
            console.error(`❌ FAILURE: Expected 2, got ${occupied}`);
        }

        // Cleanup
        await User.deleteMany({ hostelId: hostel._id });
        await Hostel.findByIdAndDelete(hostel._id);
        console.log("Cleanup complete.");

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

verifyOccupancy();
