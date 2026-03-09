/* eslint-disable */
const mongoose = require('mongoose');
const FoodItem = require('../models/FoodItem');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/saveserve';

const getCategory = (name) => {
    const n = name.toLowerCase();
    if (n.includes('roti') || n.includes('naan') || n.includes('paratha') || n.includes('chapati') || n.includes('puri') || n.includes('bhatura') || n.includes('kulcha')) return 'Breads';
    if (n.includes('rice') || n.includes('biryani') || n.includes('pulao') || n.includes('khichdi') || n.includes('bath')) return 'Rice';
    if (n.includes('tea') || n.includes('coffee') || n.includes('lassi') || n.includes('milk') || n.includes('juice') || n.includes('shake')) return 'Beverages';
    if (n.includes('halwa') || n.includes('jamun') || n.includes('sweet') || n.includes('laddu') || n.includes('mysore') || n.includes('payasam') || n.includes('kheer') || n.includes('cake') || n.includes('ice cream') || n.includes('burfi') || n.includes('peda') || n.includes('rasgulla') || n.includes('ras malai') || n.includes('sandesh') || n.includes('jalebi') || n.includes('mysore pak')) return 'Dessert';
    if (n.includes('samosa') || n.includes('kachori') || n.includes('pakora') || n.includes('vada') || n.includes('bajji') || n.includes('sandwich') || n.includes('burger') || n.includes('puff')) return 'Snacks';
    return 'Main';
};

const getVegOrNonVeg = (name) => {
    const n = name.toLowerCase();
    if (n.includes('chicken') || n.includes('egg') || n.includes('mutton') || n.includes('fish') || n.includes('prawn') || n.includes('maach')) return 'non-veg';
    return 'veg';
};

const seedFoodItems = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected');

        const catalogPath = path.join(__dirname, '../food-catalog.json');
        const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

        console.log(`Found ${catalog.length} items in JSON`);

        // Clear existing global items (where ownerId is null)
        await FoodItem.deleteMany({ ownerId: null });
        console.log('Cleared existing global food items');

        const itemsToInsert = catalog.map(item => ({
            foodName: item.displayName,
            normalizedName: item.normalizedName,
            imageUrl: item.defaultImage,
            category: getCategory(item.displayName),
            vegOrNonVeg: getVegOrNonVeg(item.displayName),
            isCustomDish: false,
            ownerId: null
        }));

        await FoodItem.insertMany(itemsToInsert);
        console.log(`Seeded ${itemsToInsert.length} food items`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedFoodItems();
