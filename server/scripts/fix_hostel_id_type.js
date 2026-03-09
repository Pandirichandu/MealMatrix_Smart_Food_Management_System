const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const migrateHostelIds = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const students = await User.find({ role: 'student', hostelId: { $type: "string" } });
        console.log(`Found ${students.length} students with string hostelId`);

        if (students.length > 0) {
            const result = await User.updateMany(
                { role: 'student', hostelId: { $type: "string" } },
                [
                    {
                        $set: {
                            hostelId: { $toObjectId: "$hostelId" }
                        }
                    }
                ]
            );
            console.log('Migration Result:', result);
        } else {
            console.log('No migration needed.');
        }

        const count = await User.countDocuments({ role: 'student' });
        console.log(`Total Students: ${count}`);

        mongoose.connection.close();
    } catch (err) {
        console.error('Migration Error:', err);
        process.exit(1);
    }
};

migrateHostelIds();
