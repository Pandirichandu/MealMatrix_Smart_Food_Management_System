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

async function debugData() {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI not found");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setDate(end.getDate() + 10);

    const menus = await Menu.find({
        date: { $gte: start, $lte: end }
    }).sort({ date: 1, mealType: 1 });

    console.log(`Found ${menus.length} menu entries.`);

    menus.forEach(m => {
        const d = m.date.toISOString().split('T')[0];
        console.log(`\nDate: ${d} | Meal: ${m.mealType}`);

        const checkItems = (items, type) => {
            if (items.length > 0) {
                console.log(`  ${type}:`);
                items.forEach(i => {
                    console.log(`    - "${i.foodName}" (StartsWith 'future '?: ${i.foodName.toLowerCase().startsWith('future ')})`);
                });
            }
        };

        checkItems(m.vegItems, 'Veg');
        checkItems(m.nonVegItems, 'NonVeg');
    });

    await mongoose.disconnect();
}

debugData().catch(console.error);
