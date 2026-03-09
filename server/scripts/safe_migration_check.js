const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const Hostel = require('../models/Hostel');
const User = require('../models/User');

const migrateAndVerify = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected for Migration Check');

        // 1. Check for Conflicts (User says they have hostel X, but Hostel says owner is Y)
        // Since we are moving to single source of truth (Hostel.ownerId), we just want to know if there are "orphaned" pointers in User model
        // matching the user request: "Conflict: User X has hostelId A but Hostel.ownerId = B"

        console.log('--- Starting Conflict Scan ---');
        let conflictCount = 0;
        let matchedCount = 0;
        let skippedCount = 0;

        const users = await User.find({ role: 'owner', hostelId: { $ne: null } });

        for (const user of users) {
            const hostel = await Hostel.findById(user.hostelId);

            if (!hostel) {
                console.log(`Log: User ${user.name} has invalid hostelId ${user.hostelId} (Hostel not found)`);
                skippedCount++;
                continue;
            }

            if (hostel.ownerId && hostel.ownerId.toString() === user._id.toString()) {
                matchedCount++;
            } else {
                console.error(`Conflict: User ${user.name} (${user._id}) claims hostel ${hostel.name}, but Hostel.ownerId is ${hostel.ownerId}`);
                conflictCount++;
            }
        }

        console.log('--- Scan Summary ---');
        console.log(`Matched (Sync): ${matchedCount}`);
        console.log(`Skipped (Invalid ID): ${skippedCount}`);
        console.log(`Conflicts Detected: ${conflictCount}`);

        if (conflictCount > 0) {
            console.log('⚠️ Conflicts found! Please manually resolve these before finalizing.');
        } else {
            console.log('✅ No conflicts found.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Migration Check Failed:', err);
        process.exit(1);
    }
};

migrateAndVerify();
