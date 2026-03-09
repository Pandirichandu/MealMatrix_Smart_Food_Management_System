const mongoose = require('mongoose');
const path = require('path');
const FoodItem = require('../server/models/FoodItem');
// require('dotenv') removed

const MONGO_URI = 'mongodb://127.0.0.1:27017/saveserve';

async function checkDishes() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const count = await FoodItem.countDocuments();
        console.log(`FoodItem Count: ${count}`);

        if (count === 0) {
            console.log('❌ No dishes found. Seeding required.');
        } else {
            console.log('✅ Dishes exist.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkDishes();
