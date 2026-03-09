const mongoose = require('../server/node_modules/mongoose');
const path = require('path');
const fs = require('fs');

// Manual Env Parsing
try {
    const envPath = path.join(__dirname, '../.env');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.error("Warning: Could not read .env file manualy", e);
}

const Menu = require('../server/models/Menu');

async function cleanup() {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI not found");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const menus = await Menu.find({});
    console.log(`Scanning ${menus.length} menus...`);

    let modifiedCount = 0;
    let deletedCount = 0;

    for (const menu of menus) {
        let isModified = false;

        // 1. Remove Future * items
        const initialVegCount = menu.vegItems.length;
        const initialNonVegCount = menu.nonVegItems.length;

        menu.vegItems = menu.vegItems.filter(item => !/^future/i.test(item.foodName));
        menu.nonVegItems = menu.nonVegItems.filter(item => !/^future/i.test(item.foodName));

        if (menu.vegItems.length !== initialVegCount || menu.nonVegItems.length !== initialNonVegCount) {
            console.log(`[${menu.date.toISOString().split('T')[0]} - ${menu.mealType}] Removed placeholders.`);
            isModified = true;
        }

        // 2. Ensure Status match default
        if (!menu.status) {
            menu.status = 'PUBLISHED';
            isModified = true;
        }

        // 3. Save or Delete if empty
        if (menu.vegItems.length === 0 && menu.nonVegItems.length === 0) {
            // Option: Delete empty menus entirely to be cleaner
            // console.log(`[${menu.date.toISOString().split('T')[0]} - ${menu.mealType}] is now empty. Deleting.`);
            // await Menu.deleteOne({ _id: menu._id });
            // deletedCount++;

            // Alternative: Keep them but check persistence. 
            // The user requested: "A menu is considered AVAILABLE only if... menu.items.length > 0"
            // So empty arrays are fine, they just won't show.
            // I will save them cleaned.
            if (isModified) {
                await menu.save();
                modifiedCount++;
            }
        } else {
            if (isModified) {
                await menu.save();
                modifiedCount++;
            }
        }
    }

    console.log(`Cleanup Complete.`);
    console.log(`Modified: ${modifiedCount}`);
    console.log(`Deleted: ${deletedCount}`);

    await mongoose.disconnect();
}

cleanup().catch(console.error);
