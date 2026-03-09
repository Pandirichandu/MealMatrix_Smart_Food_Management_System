const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Setup Mongoose model locally to avoid dependency issues in the script
const FoodItemSchema = new mongoose.Schema({
    foodName: { type: String, required: true },
    isCustomDish: { type: Boolean, default: false }
}, { strict: false }); // strict: false allows us to just query without defining every field

const FoodItem = mongoose.model('FoodItem', FoodItemSchema);

async function cleanupDatabase() {
    try {
        console.log('Connecting to MongoDB...');
        // The project has been using 127.0.0.1 in previous scripts based on history context
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mealmatrix';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB.');

        const initialCount = await FoodItem.countDocuments();
        console.log(`Initial FoodItem count: ${initialCount}`);

        // Find Chapati just to verify it exists
        const chapati = await FoodItem.findOne({ foodName: { $regex: /chapati/i } });
        const chapatiName = chapati ? chapati.foodName : "Chapati";
        if (chapati) {
            console.log(`Found target to preserve: "${chapatiName}"`);
        } else {
            console.log(`WARNING: "Chapati" not found in database! Will preserve exact match "Chapati" if it exists.`);
        }

        // Delete all except Chapati
        // The user specified "Chapati", but let's be safe with case-insensitivity if needed, 
        // though the prompt said name !== "Chapati". We'll use a regex for exact case-insensitive match just in case, or just exact string.
        // Let's use strict not equal to Chapati, but case-insensitive to be safe so we don't accidentally delete "chapati".
        const deleteResult = await FoodItem.deleteMany({
            foodName: { $not: { $regex: /^Chapati$/i } }
        });

        console.log(`Deleted ${deleteResult.deletedCount} dishes.`);

        const finalCount = await FoodItem.countDocuments();
        console.log(`Final FoodItem count: ${finalCount}`);

        const remainingDishes = await FoodItem.find({}, 'foodName');
        console.log('Remaining dishes in DB:');
        remainingDishes.forEach(d => console.log(`- ${d.foodName}`));

    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
        process.exit(0);
    }
}

cleanupDatabase();
