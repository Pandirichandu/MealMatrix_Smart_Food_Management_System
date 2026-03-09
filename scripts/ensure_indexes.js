const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

try {
    const envPath = path.join(__dirname, '../.env');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) process.env[key.trim()] = value.trim();
    });
} catch (e) {
    console.error("Warning: Could not read .env", e);
}

async function fixIndexes() {
    if (!process.env.MONGODB_URI) { console.error("Missing MONGODB_URI"); process.exit(1); }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB. Checking Indexes...");

        const Menu = require('../server/models/Menu');

        // 1. Drop old indexes to be safe (if any wrong ones exist)
        try {
            await Menu.collection.dropIndexes();
            console.log("✓ Dropped old indexes");
        } catch (e) {
            console.log("No indexes to drop or unrelated error");
        }

        // 2. Create Correct Index
        // { hostelId: 1, date: 1, mealType: 1 } -> UNIQUE
        await Menu.collection.createIndex(
            { hostelId: 1, date: 1, mealType: 1 },
            { unique: true, background: false }
        );
        console.log("✓ Created Unique Index: { hostelId, date, mealType }");

        console.log("SUCCESS: Database Schema is Strictly Enforced.");

    } catch (e) {
        console.error("Index Fix Failed:", e);
    } finally {
        await mongoose.disconnect();
    }
}

fixIndexes();
