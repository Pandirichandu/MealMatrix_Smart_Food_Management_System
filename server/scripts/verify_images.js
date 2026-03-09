const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const FoodItem = require('../models/FoodItem');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const imagesDir = path.join(__dirname, '../public/menu-images');

const verifyImages = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("Missing MONGODB_URI in .env");
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const dishes = await FoodItem.find({});
        console.log(`Checking images for ${dishes.length} dishes...`);
        console.log(`Image Directory: ${imagesDir}`);

        let missingCount = 0;

        for (const dish of dishes) {
            const url = dish.imageUrl;
            if (!url) {
                console.log(`[MISSING URL] Dish: "${dish.foodName}" has no imageUrl`);
                continue;
            }

            // Remove leading /menu-images/ to get relative path
            const relativePath = url.replace(/^\/menu-images\//, '').replace(/^\\menu-images\\/, '');
            const filePath = path.join(imagesDir, relativePath);

            if (!fs.existsSync(filePath)) {
                console.log(`[BROKEN] Dish: "${dish.foodName}" | URL: ${url} | Looking at: ${filePath}`);
                missingCount++;
            }
        }

        if (missingCount === 0) {
            console.log('✅ All image files exist on disk.');
        } else {
            console.log(`❌ Found ${missingCount} broken image links.`);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
        process.exit();
    }
};

verifyImages();
