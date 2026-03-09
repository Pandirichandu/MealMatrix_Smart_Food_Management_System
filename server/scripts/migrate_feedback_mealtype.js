const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' }); // Adjust path as necessary
const Feedback = require('../models/Feedback');

async function runMigration() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Connected.");

        console.log("Starting Migration: Setting missing or null mealType in Feedback to 'lunch'...");

        // Update documents where mealType is missing or null
        const result = await Feedback.updateMany(
            {
                $or: [
                    { mealType: { $exists: false } },
                    { mealType: null }
                ]
            },
            {
                $set: { mealType: 'lunch' }
            }
        );

        console.log("=====================================");
        console.log("Migration Summary:");
        console.log(`Matched documents: ${result.matchedCount}`);
        console.log(`Modified documents: ${result.modifiedCount}`);
        console.log("=====================================");

        console.log("Migration completed successfully.");

    } catch (err) {
        console.error("Error during migration:", err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

runMigration();
