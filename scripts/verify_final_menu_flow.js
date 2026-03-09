const mongoose = require('../server/node_modules/mongoose');
const path = require('path');
const fs = require('fs');

// Manual Env Parsing to avoid dotenv dependency issues
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

// Helper to extract token from Set-Cookie header
function getTokenFromCookie(res) {
    // node-fetch / global fetch headers are a Map-like object
    const cookies = res.headers.get('set-cookie');
    if (!cookies) return null;
    // set-cookie can be a string or array. In node fetch it's often a string if single, or we need raw()
    // For simplicity, let's assume standard formatting. 
    // In Node 18+ fetch, get('set-cookie') might join multiple cookies with comma.

    // We only care about 'token='.
    const match = cookies.match(/token=([^;]+)/);
    return match ? match[1] : null;
}

async function seedUsers() {
    console.log("[Setup] Starting Seeding Process...");
    // console.log(`[Debug] MONGODB_URI exists? ${!!process.env.MONGODB_URI}`);

    if (!process.env.MONGODB_URI) {
        console.error("FATAL: MONGODB_URI missing from .env");
        throw new Error("MONGODB_URI not found in .env");
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);

        // Use Root Mongoose (since it works), but Models might need adjustment?
        // Models require mongoose. server/models/User.js does: const mongoose = require('mongoose');
        // If we require('../server/models/User'), it will resolve 'mongoose' from server/models/node_modules or up to server/node_modules or root.
        // It SHOULD resolve.

        const User = require('../server/models/User');

        // Bcrypt replacement: Hardcoded hash for "password123"
        // $2a$10$TestSaltForPassword123Hash (Fake but valid structure? No, use real)
        // Helper: bcrypt.hashSync("password123", 10) -> $2a$10$Q...
        // Let's rely on server/node_modules if possible, or use a known hash.
        // Known hash for 'password123': $2a$10$X7.1m1q.1.1.1.1.1.1.1.1 (No, invalid)

        // Try require from server node_modules
        let bcrypt;
        try {
            bcrypt = require('../server/node_modules/bcryptjs');
        } catch (e) {
            // Fallback: Try root (unlikely) or just use plaintext/dummy if scheme allows? No, schema uses bcrypt.
            // Let's assume server/node_modules exists.
            bcrypt = require('bcryptjs'); // Just try, if fail we crash.
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("password123", salt);

        // Seed Hostel (needed for owner)
        const Hostel = require('../server/models/Hostel');
        let hostel = await Hostel.findOne({ name: "Strict Logic Hostel" });
        if (!hostel) {
            hostel = await Hostel.create({ name: "Strict Logic Hostel", location: "Test Location", totalRooms: 50 });
        }

        // Seed Owner
        await User.findOneAndUpdate(
            { email: "owner@example.com" },
            {
                name: "Test Owner",
                role: "owner",
                password: hashedPassword,
                hostelId: hostel._id
            },
            { upsert: true, new: true }
        );

        // Seed Student
        await User.findOneAndUpdate(
            { email: "student@example.com" },
            {
                name: "Test Student",
                role: "student",
                password: hashedPassword,
                hostelId: hostel._id,
                studentId: "ST-TEST-001"
            },
            { upsert: true, new: true }
        );

        console.log("✓ Users Seeded (owner@example.com / student@example.com)");

    } catch (e) {
        console.error("Seeding Failed:", e);
        // Don't exit, might be connection error or already exists, try running test anyway
    } finally {
        await mongoose.disconnect();
    }
}

async function runTest() {
    await seedUsers();

    console.log("=== STARTING FINAL MENU LOGIC VERIFICATION (Native Fetch) ===");

    // 1. LOGIN OWNER
    console.log("\n[1] Logging in Owner...");
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: "owner@example.com", password: "password123" })
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Status ${res.status}: ${txt}`);
        }

        ownerToken = getTokenFromCookie(res);
        if (!ownerToken) throw new Error("No token in cookie");
        console.log("✓ Owner Logged In");
    } catch (e) {
        console.error("Owner Login Failed:", e.message);
        process.exit(1);
    }

    // 2. DEFINE TEST DATA
    // Use TOMORROW as "Base Day" to avoid Cutoff Restrictions (since it's likely past breakfast cutoff today)
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 1);

    const YYYY = baseDate.getFullYear();
    const MM = String(baseDate.getMonth() + 1).padStart(2, '0');
    const DD = String(baseDate.getDate()).padStart(2, '0');
    const dateStr = `${YYYY}-${MM}-${DD}`; // Tomorrow (Base Day)

    // Future Date (Day After Base)
    const nextDay = new Date(baseDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const tomYYYY = nextDay.getFullYear();
    const tomMM = String(nextDay.getMonth() + 1).padStart(2, '0');
    const tomDD = String(nextDay.getDate()).padStart(2, '0');
    const tomDateStr = `${tomYYYY}-${tomMM}-${tomDD}`;

    console.log(`\n[2] Target Dates: Base=${dateStr}, Next=${tomDateStr}`);

    // 3. PUBLISH DISTINCT MEALS
    const breakfastPayload = {
        date: dateStr,
        mealType: "breakfast",
        vegItems: [{ foodName: "Strict Bfast Veg", imageUrl: "/img.jpg", vegOrNonVeg: "veg", price: 50 }],
        nonVegItems: []
    };

    const lunchPayload = {
        date: dateStr,
        mealType: "lunch",
        vegItems: [],
        nonVegItems: [{ foodName: "Strict Lunch NonVeg", imageUrl: "/img.jpg", vegOrNonVeg: "non-veg", price: 100 }]
    };

    const dinnerPayload = {
        date: dateStr,
        mealType: "dinner",
        vegItems: [{ foodName: "Strict Dinner Veg", imageUrl: "/img.jpg", vegOrNonVeg: "veg", price: 80 }],
        nonVegItems: []
    };

    const tomBreakfastPayload = {
        date: tomDateStr,
        mealType: "breakfast",
        vegItems: [{ foodName: "Strict Tom Bfast", imageUrl: "/img.jpg", vegOrNonVeg: "veg", price: 60 }],
        nonVegItems: []
    };

    const ownerHeaders = {
        'Content-Type': 'application/json',
        'Cookie': `token=${ownerToken}`
    };

    async function publish(payload) {
        const res = await fetch(`${API_URL}/owner/save-menu`, {
            method: 'POST',
            headers: ownerHeaders,
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const txt = await res.text(); // Read error body
            throw new Error(`Status ${res.status}: ${txt}`);
        }
    }

    try {
        console.log("-> Publishing Today Breakfast...");
        await publish(breakfastPayload);

        console.log("-> Publishing Today Lunch...");
        await publish(lunchPayload);

        console.log("-> Publishing Today Dinner...");
        await publish(dinnerPayload);

        console.log("-> Publishing Tomorrow Breakfast...");
        await publish(tomBreakfastPayload);

        console.log("✓ Menus Published Successfully");
    } catch (e) {
        console.error("Menu Publish Failed:", e.message);
        process.exit(1);
    }

    // 4. LOGIN STUDENT
    console.log("\n[4] Logging in Student...");
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: "student@example.com", password: "password123" })
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);
        studentToken = getTokenFromCookie(res);
        if (!studentToken) throw new Error("No token in cookie");
        console.log("✓ Student Logged In");
    } catch (e) {
        console.error("Student Login Failed:", e.message);
        process.exit(1);
    }

    const studentHeaders = {
        'Cookie': `token=${studentToken}`
    };

    // 5. FETCH & VERIFY WEEKLY MENU
    console.log("\n[5] Fetching Weekly Menu...");
    try {
        const res = await fetch(`${API_URL}/student/menu`, { headers: studentHeaders });
        const menuList = await res.json();

        // Find Today's Entry
        const todayEntry = menuList.find(m => m.date === dateStr);
        if (!todayEntry) throw new Error(`Today's menu entry (${dateStr}) not found!`);

        // VERIFY SEPARATION
        console.log("-> Verifying Today's Separation...");

        const bCount = todayEntry.breakfast ? todayEntry.breakfast.length : 0;
        const lCount = todayEntry.lunch ? todayEntry.lunch.length : 0;
        const dCount = todayEntry.dinner ? todayEntry.dinner.length : 0;

        if (bCount !== 1) throw new Error(`Breakfast count mismatch. Expected 1, got ${bCount}`);
        if (lCount !== 1) throw new Error(`Lunch count mismatch. Expected 1, got ${lCount}`);
        if (dCount !== 1) throw new Error(`Dinner count mismatch. Expected 1, got ${dCount}`);

        if (todayEntry.breakfast[0].foodName !== "Strict Bfast Veg") throw new Error("Breakfast item mismatch!");
        if (todayEntry.lunch[0].foodName !== "Strict Lunch NonVeg") throw new Error("Lunch item mismatch!");

        console.log("✓ Today's Menu strictly separated (No overwrites)");

        // Find Tomorrow's Entry
        const tomEntry = menuList.find(m => m.date === tomDateStr);
        if (!tomEntry) throw new Error(`Tomorrow's menu entry (${tomDateStr}) not found!`);

        console.log("-> Verifying Tomorrow's Separation...");
        const tomBCount = tomEntry.breakfast ? tomEntry.breakfast.length : 0;

        // Ensure only breakfast exists for tomorrow as published
        if (tomBCount !== 1) throw new Error(`Tomorrow Breakfast count mismatch. Expected 1, got ${tomBCount}`);
        if (tomEntry.breakfast[0].foodName !== "Strict Tom Bfast") throw new Error("Tomorrow items mismatch!");

        // Ensure no leakage of lunch/dinner from today
        if (tomEntry.lunch && tomEntry.lunch.length > 0) throw new Error("Tomorrow has ghost Lunch items!");

        console.log("✓ Tomorrow's Menu correct and distinct from Today");

    } catch (e) {
        console.error("Weekly Menu Verification Failed:", e.message);
        process.exit(1);
    }

    // 6. FETCH TODAY SPECIFIC
    console.log("\n[6] Fetching /today-menu API...");
    try {
        const res = await fetch(`${API_URL}/student/today-menu?date=${dateStr}`, { headers: studentHeaders });
        const data = await res.json();

        if (!data.breakfast || data.breakfast.length !== 1) throw new Error("Today-Menu API: Breakfast missing/wrong");

        console.log("✓ /today-menu API verified valid");

    } catch (e) {
        console.error("today-menu Verification Failed:", e.message);
        process.exit(1);
    }

    // 7. FETCH EMPTY DAY
    console.log("\n[7] Fetching Empty Day...");
    try {
        const futureDate = new Date(baseDate);
        futureDate.setDate(futureDate.getDate() + 10);
        const fDateStr = futureDate.toISOString().split('T')[0];

        const res = await fetch(`${API_URL}/student/today-menu?date=${fDateStr}`, { headers: studentHeaders });
        const data = await res.json();

        const totalItems = (data.breakfast?.length || 0) + (data.lunch?.length || 0) + (data.dinner?.length || 0);
        if (totalItems !== 0) throw new Error("Empty day returning data!");

        console.log("✓ Empty day returning clean empty structure");

    } catch (e) {
        console.error("Empty Day Verification Failed:", e.message);
        process.exit(1);
    }

    console.log("\n=== SUCCESS: ALL CHECKS PASSED ===");
}

runTest().catch(err => {
    console.error("FATAL SCRIPT ERROR:", err);
    process.exit(1);
});
