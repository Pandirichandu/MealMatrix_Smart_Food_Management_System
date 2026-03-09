const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const Hostel = require('../models/Hostel');

const checkDuplicates = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Find owners assigned to multiple hostels
        const duplicates = await Hostel.aggregate([
            {
                $match: { ownerId: { $ne: null } }
            },
            {
                $group: {
                    _id: "$ownerId",
                    count: { $sum: 1 },
                    hostels: { $push: "$name" }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            }
        ]);

        if (duplicates.length > 0) {
            console.log('❌ Found Duplicates!');
            duplicates.forEach(d => {
                console.log(`Owner ID: ${d._id} is assigned to: ${d.hostels.join(', ')}`);
            });
        } else {
            console.log('✅ No duplicate owner assignments found.');
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkDuplicates();
