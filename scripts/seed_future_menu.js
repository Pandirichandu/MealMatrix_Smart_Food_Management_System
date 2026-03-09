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
const Hostel = require('../server/models/Hostel');

async function seedFuturedata() {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI not found");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const hostel = await Hostel.findOne();
    if (!hostel) throw new Error("No hostel found");

    // Target Date: 5 days from now
    const date = new Date();
    date.setDate(date.getDate() + 5);
    date.setHours(0, 0, 0, 0);

    const dateStr = date.toISOString().split('T')[0];
    console.log(`Seeding data for ${dateStr}...`);

    // 1. Mixed Day (Future Breakfast + Real Lunch)
    // We need to upsert.

    const mkItem = (name, type) => ({
        foodName: name,
        imageUrl: "/placeholder.jpg",
        category: "Main",
        vegOrNonVeg: type,
        price: 50,
        mealType: "breakfast" // dummy, overwritten
    });

    // Cleanup first
    await Menu.deleteMany({ date: date });

    // Breakfast: Future Only
    await Menu.create({
        hostelId: hostel._id,
        date: date,
        mealType: 'breakfast',
        vegItems: [mkItem("Future Breakfast", "veg")],
        nonVegItems: []
    });

    // Lunch: Real Item
    await Menu.create({
        hostelId: hostel._id,
        date: date,
        mealType: 'lunch',
        vegItems: [mkItem("Real Paneer", "veg")],
        nonVegItems: []
    });

    // Dinner: Future Only
    await Menu.create({
        hostelId: hostel._id,
        date: date,
        mealType: 'dinner',
        vegItems: [mkItem("Future Dinner", "veg")],
        nonVegItems: []
    });

    console.log("✓ Seeded Mixed Day");

    // 2. All Future Day (6 days from now)
    const date2 = new Date(date);
    date2.setDate(date2.getDate() + 1);
    const dateStr2 = date2.toISOString().split('T')[0];
    console.log(`Seeding data for ${dateStr2}...`);

    await Menu.deleteMany({ date: date2 });

    await Menu.create({ hostelId: hostel._id, date: date2, mealType: 'breakfast', vegItems: [mkItem("Future Breakfast", "veg")], nonVegItems: [] });
    await Menu.create({ hostelId: hostel._id, date: date2, mealType: 'lunch', vegItems: [mkItem("Future Lunch", "veg")], nonVegItems: [] });
    await Menu.create({ hostelId: hostel._id, date: date2, mealType: 'dinner', vegItems: [mkItem("Future Dinner", "veg")], nonVegItems: [] });

    console.log("✓ Seeded All-Future Day");

    console.log("\n=== VERIFICATION INSTRUCTIONS ===");
    console.log(`1. Go to Admin/Student Menu.`);
    console.log(`2. Select ${date.toLocaleDateString()} (Mixed Day).`);
    console.log(`   - Expect: Breakfast & Dinner show 'Not Yet Updated' (items filtered). Lunch shows 'Real Paneer'.`);
    console.log(`   - Expect: Admin Grid shows cards. Student view shows 'Not Yet Updated' for B/D.`);
    console.log(`3. Select ${date2.toLocaleDateString()} (All Future).`);
    console.log(`   - Expect: ALL meals show 'Not Yet Updated'.`);

    await mongoose.disconnect();
}

seedFuturedata().catch(console.error);
