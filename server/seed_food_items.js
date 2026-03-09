const mongoose = require('mongoose');
const FoodItem = require('./models/FoodItem');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saveserve';

const SAMPLE_DISHES = [
    { foodName: 'Masala Dosa', category: 'Main', vegOrNonVeg: 'veg', price: 50, imageUrl: '/menu-images/dosa.jpg' },
    { foodName: 'Idli Sambar', category: 'Main', vegOrNonVeg: 'veg', price: 40, imageUrl: '/menu-images/idli.jpg' },
    { foodName: 'Chicken Biryani', category: 'Main', vegOrNonVeg: 'non-veg', price: 120, imageUrl: '/menu-images/biryani.jpg' },
    { foodName: 'Veg Biryani', category: 'Rice', vegOrNonVeg: 'veg', price: 90, imageUrl: '/menu-images/vegbiryani.jpg' },
    { foodName: 'Chapati', category: 'Breads', vegOrNonVeg: 'veg', price: 10, imageUrl: '/menu-images/chapati.jpg' },
    { foodName: 'Paneer Butter Masala', category: 'Main', vegOrNonVeg: 'veg', price: 110, imageUrl: '/menu-images/paneer.jpg' },
    { foodName: 'Chicken Curry', category: 'Main', vegOrNonVeg: 'non-veg', price: 130, imageUrl: '/menu-images/chicken.jpg' },
    { foodName: 'Gulab Jamun', category: 'Dessert', vegOrNonVeg: 'veg', price: 30, imageUrl: '/menu-images/dessert.jpg' },
    { foodName: 'Tea', category: 'Beverages', vegOrNonVeg: 'veg', price: 10, imageUrl: '/menu-images/tea.jpg' },
    { foodName: 'Coffee', category: 'Beverages', vegOrNonVeg: 'veg', price: 15, imageUrl: '/menu-images/coffee.jpg' }
];

async function seedDishes() {
    try {
        console.log('Connecting to MongoDB...', MONGO_URI);
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        const count = await FoodItem.countDocuments();
        if (count > 0) {
            console.log(`Dishes already exist (${count}). Skipping seed.`);
            process.exit(0);
        }

        console.log('Seeding dishes...');
        await FoodItem.insertMany(SAMPLE_DISHES);
        console.log('✅ Dishes seeded successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seedDishes();
