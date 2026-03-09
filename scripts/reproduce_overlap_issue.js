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

const API_URL = 'http://127.0.0.1:5003/api';

// Simple token storage
let ownerToken = null;
let studentToken = null;

function getTokenFromCookie(res) {
    const cookies = res.headers.get('set-cookie');
    if (!cookies) return null;
    const match = cookies.match(/token=([^;]+)/);
    return match ? match[1] : null;
}

async function runTest() {
    console.log("=== STARTING MEAL OVERLAP REPRODUCTION ===");

    // 1. LOGIN OWNER
    console.log("\n[1] Logging in Owner...");
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: "owner@example.com", password: "password123" })
        });
        if (!res.ok) throw new Error(await res.text());
        ownerToken = getTokenFromCookie(res);
        console.log("✓ Owner Logged In");
    } catch (e) {
        console.error("Owner Login Failed:", e.message);
        process.exit(1);
    }

    // 2. DEFINE DATE (TOMORROW to avoid cutoff)
    const date = new Date();
    date.setDate(date.getDate() + 1);
    const dateStr = date.toISOString().split('T')[0];
    console.log(`\n[2] Target Date: ${dateStr}`);

    // 3. PUBLISH DISTINCT MEALS
    const ownerHeaders = {
        'Content-Type': 'application/json',
        'Cookie': `token=${ownerToken}`
    };

    const meals = [
        { type: 'breakfast', item: 'Strict Breakfast Item' },
        { type: 'lunch', item: 'Strict Lunch Item' },
        { type: 'dinner', item: 'Strict Dinner Item' }
    ];

    for (const meal of meals) {
        console.log(`-> Publishing ${meal.type}...`);
        const payload = {
            date: dateStr,
            mealType: meal.type,
            vegItems: [{ foodName: meal.item, vegOrNonVeg: 'veg', price: 50, category: 'Main' }],
            nonVegItems: []
        };

        const res = await fetch(`${API_URL}/owner/save-menu`, {
            method: 'POST',
            headers: ownerHeaders,
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            console.error(`Failed to save ${meal.type}:`, await res.text());
            process.exit(1);
        }

        // Debug Response
        const savedDoc = await res.json();
        console.log(`   Saved Doc MealType: ${savedDoc.mealType}`);
        if (savedDoc.mealType !== meal.type) {
            console.error(`   CRITICAL: Saved mealType '${savedDoc.mealType}' does not match requested '${meal.type}'!`);
        }
    }

    // 4. LOGIN STUDENT
    console.log("\n[4] Logging in Student...");
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: "student@example.com", password: "password123" })
        });
        if (!res.ok) throw new Error(await res.text());
        studentToken = getTokenFromCookie(res);
        console.log("✓ Student Logged In");
    } catch (e) {
        console.error("Student Login Failed:", e.message);
        process.exit(1);
    }

    // 5. FETCH AS STUDENT
    console.log("\n[5] Fetching Student Menu...");
    const res = await fetch(`${API_URL}/student/today-menu?date=${dateStr}`, {
        headers: { 'Cookie': `token=${studentToken}` }
    });
    const data = await res.json();

    // 6. VERIFY NO OVERLAP
    console.log("\n[6] Verifying Data Separation...");
    console.log("Breakfast Items:", JSON.stringify(data.breakfast?.map(i => i.foodName)));
    console.log("Lunch Items:", JSON.stringify(data.lunch?.map(i => i.foodName)));
    console.log("Dinner Items:", JSON.stringify(data.dinner?.map(i => i.foodName)));

    let failed = false;

    // Check Breakfast
    if (!data.breakfast || !data.breakfast.find(i => i.foodName === 'Strict Breakfast Item')) {
        console.error("❌ Breakfast item missing from Breakfast section");
        failed = true;
    }
    if (data.breakfast && data.breakfast.find(i => i.foodName.includes('Lunch') || i.foodName.includes('Dinner'))) {
        console.error("❌ Breakfast section contains Lunch/Dinner items!");
        failed = true;
    }

    // Check Lunch
    if (!data.lunch || !data.lunch.find(i => i.foodName === 'Strict Lunch Item')) {
        console.error("❌ Lunch item missing from Lunch section");
        failed = true;
    }
    if (data.lunch && data.lunch.find(i => i.foodName.includes('Breakfast') || i.foodName.includes('Dinner'))) {
        console.error("❌ Lunch section contains Breakfast/Dinner items!");
        failed = true;
    }

    // Check Dinner
    if (!data.dinner || !data.dinner.find(i => i.foodName === 'Strict Dinner Item')) {
        console.error("❌ Dinner item missing from Dinner section");
        failed = true;
    }

    if (!failed) {
        console.log("\n✅ SUCCESS: Backend logic is correct. Meals are separated.");
    } else {
        console.error("\n❌ FAILURE: Backend logic is flawed.");
    }
}

runTest();
