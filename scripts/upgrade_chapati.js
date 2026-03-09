const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Setup Mongoose model
const FoodItemSchema = new mongoose.Schema({
    foodName: { type: String, required: true },
    isCustomDish: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
}, { strict: false });

const FoodItem = mongoose.model('FoodItem', FoodItemSchema);

async function upgradeChapati() {
    try {
        console.log('Connecting to MongoDB...');
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mealmatrix';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB.');

        // Find Chapati
        const chapati = await FoodItem.findOne({ foodName: { $regex: /chapati/i } });

        if (!chapati) {
            console.log('❌ Chapati not found in the database!');
            return;
        }

        console.log('Found Chapati. Current state:');
        console.log(`- foodName: ${chapati.foodName}`);
        console.log(`- isCustomDish: ${chapati.isCustomDish}`);
        console.log(`- isActive: ${chapati.isActive}`);

        // Update fields
        chapati.isCustomDish = true;
        chapati.isActive = true;

        await chapati.save();

        console.log('\n✅ Successfully upgraded Chapati. New state:');
        console.log(`- foodName: ${chapati.foodName}`);
        console.log(`- isCustomDish: ${chapati.isCustomDish}`);
        console.log(`- isActive: ${chapati.isActive}`);

    } catch (error) {
        console.error('Error during upgrade:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
        process.exit(0);
    }
}

upgradeChapati();
