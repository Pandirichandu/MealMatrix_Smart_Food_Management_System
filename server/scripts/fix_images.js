const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const FoodItem = require('../models/FoodItem');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const imagesDir = path.join(__dirname, '../public/menu-images');
const placeholder = '/menu-images/placeholder.jpg';

const fixImages = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const dishes = await FoodItem.find({});
        let updatedCount = 0;

        // Get list of actual files on disk
        const filesOnDisk = fs.readdirSync(imagesDir).map(f => f.toLowerCase());
        const actualFiles = fs.readdirSync(imagesDir);

        for (const dish of dishes) {
            const url = dish.imageUrl;
            if (!url) continue;

            const filename = path.basename(url);
            // Handle both forward and backward slashes for cross-platform compatibility
            const relativePath = url.replace(/^\/menu-images\//, '').replace(/^\\menu-images\\/, '');
            const filePath = path.join(imagesDir, relativePath);

            if (!fs.existsSync(filePath)) {
                // Try to find a case-insensitive match
                const matchIndex = filesOnDisk.indexOf(filename.toLowerCase());

                if (matchIndex !== -1) {
                    // Found a match with different casing
                    const correctFilename = actualFiles[matchIndex];
                    const newUrl = `/menu-images/${correctFilename}`;
                    console.log(`[FIXING CASE] ${dish.foodName}: ${url} -> ${newUrl}`);

                    dish.imageUrl = newUrl;
                    await dish.save();
                    updatedCount++;
                } else if (!url.includes('custom/')) {
                    // If it's a standard dish and file is missing, use placeholder
                    console.log(`[REPLACING] ${dish.foodName}: ${url} -> ${placeholder}`);
                    dish.imageUrl = placeholder;
                    await dish.save();
                    updatedCount++;
                } else {
                    console.log(`[SKIPPING CUSTOM] ${dish.foodName}: ${url} (Requires manual re-upload)`);
                }
            }
        }

        console.log(`✅ Updated ${updatedCount} dishes.`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

fixImages();
