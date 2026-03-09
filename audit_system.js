/* eslint-disable @typescript-eslint/no-require-imports */
const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:5003';

const COLORS = {
    RESET: '\x1b[0m',
    GREEN: '\x1b[32m',
    RED: '\x1b[31m',
    YELLOW: '\x1b[33m',
    CYAN: '\x1b[36m'
};

function log(msg, color = COLORS.RESET) {
    console.log(`${color}${msg}${COLORS.RESET}`);
}

const getHeaders = (cookie) => ({
    headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json'
    },
    withCredentials: true
});

async function runAudit() {
    log('=== STARTING SYSTEM AUDIT ===', COLORS.CYAN);

    try {
        const mongoUri = 'mongodb://127.0.0.1:27017/mealmatrix';
        log(`Connecting to MongoDB at ${mongoUri}...`);
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
        log('✓ MongoDB Connected', COLORS.GREEN);

        log(`Connection State: ${mongoose.connection.readyState}`);

        // Use Native Driver for Setup Queries to avoid Model/Schema issues
        const db = mongoose.connection.db;

        // 1. SETUP & CLEANUP
        log('\n--- PHASE 1: SETUP ---', COLORS.YELLOW);

        // Find Owner & Student
        log('Finding Owner (Native)...');
        const ownerUser = await db.collection('users').findOne({ role: 'owner' });
        log(`Found Owner: ${ownerUser ? ownerUser.email : 'None'}`);

        log('Finding Student (Native)...');
        const studentUser = await db.collection('users').findOne({ role: 'student' });
        log(`Found Student: ${studentUser ? studentUser.email : 'None'}`);

        if (!ownerUser || !studentUser) throw new Error('Owner or Student not found in DB');

        // Authenticate Owner
        let ownerCookie;
        try {
            const res = await axios.post(`${API_URL}/api/auth/login`, {
                email: 'owner@mealmatrix.com',
                password: '123456'
            });
            ownerCookie = res.headers['set-cookie'][0];
            log('✓ Owner Authenticated', COLORS.GREEN);
        } catch (e) {
            throw new Error('Owner Login Failed: ' + (e.response?.data?.msg || e.message));
        }

        // Authenticate Student
        let studentCookie;
        try {
            const res = await axios.post(`${API_URL}/api/auth/login`, {
                email: 'student@mealmatrix.com',
                password: '123456'
            });
            studentCookie = res.headers['set-cookie'][0];
            log('✓ Student Authenticated', COLORS.GREEN);
        } catch (e) {
            throw new Error('Student Login Failed: ' + (e.response?.data?.msg || e.message));
        }

        // Cleanup Timestamps
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tDateStr = tomorrow.toISOString().split('T')[0];

        const startOfDay = new Date(`${tDateStr}T00:00:00.000Z`);
        const endOfDay = new Date(`${tDateStr}T23:59:59.999Z`);

        // Cleanup MealBookings strict date range
        await db.collection('mealbookings').deleteMany({
            date: { $gte: startOfDay, $lte: endOfDay }
        });
        log('✓ Cleaned Test Data (MealBookings)', COLORS.GREEN);

        // 2. MENU CREATION
        log('\n--- PHASE 2: MENU CREATION ---', COLORS.YELLOW);

        // Create/Find Dish (Native)
        let dish = await db.collection('fooditems').findOne({ foodName: 'Audit Dish' });
        if (!dish) {
            const newDish = {
                foodName: 'Audit Dish',
                category: 'Breakfast',
                vegOrNonVeg: 'veg', // Lowercase as per validation often? Or Enum?
                price: 50,
                maxQuantity: 2,
                ownerId: ownerUser._id,
                __v: 0
            };
            const result = await db.collection('fooditems').insertOne(newDish);
            dish = { ...newDish, _id: result.insertedId };
        }
        log(`✓ Test Dish Ready: ${dish.foodName} (Max: ${dish.maxQuantity})`, COLORS.GREEN);

        // Publish Menu using API
        await axios.post(`${API_URL}/api/owner/save-menu`, {
            date: tDateStr,
            mealType: 'breakfast',
            vegItems: [{
                _id: dish._id.toString(),
                foodName: dish.foodName,
                quantity: 1,
                maxQuantity: 2
            }],
            nonVegItems: [],
            status: 'PUBLISHED'
        }, getHeaders(ownerCookie));
        log('✓ Menu Published for Tomorrow', COLORS.GREEN);

        // FETCH Menu to get ITEM ID
        const menuRes = await axios.get(`${API_URL}/api/owner/menu?date=${tDateStr}&mealType=breakfast`, getHeaders(ownerCookie));
        const menuItem = menuRes.data.vegItems.find(i => i.foodName === 'Audit Dish');
        if (!menuItem) throw new Error('Failed to retrieve created menu item ID');
        const validDishId = menuItem._id;


        // 3. BOOKING LOGIC VALIDATION
        log('\n--- PHASE 3: BOOKING LOGIC ---', COLORS.YELLOW);

        // Test A: Normal Booking
        await axios.post(`${API_URL}/api/student/select`, {
            date: tDateStr,
            mealType: 'breakfast',
            items: [{ _id: validDishId, itemName: dish.foodName, quantity: 2 }]
        }, getHeaders(studentCookie));
        log('✓ PASS: Normal Booking (Qty 2)', COLORS.GREEN);

        // Test B: Over-Limit Booking
        try {
            await axios.post(`${API_URL}/api/student/select`, {
                date: tDateStr,
                mealType: 'breakfast',
                items: [{ _id: validDishId, itemName: dish.foodName, quantity: 3 }]
            }, getHeaders(studentCookie));
            log('✗ FAIL: Over-limit booking was allowed!', COLORS.RED);
        } catch (e) {
            if (e.response && e.response.status === 400) {
                log('✓ PASS: Over-limit Booking Rejected', COLORS.GREEN);
            } else {
                log(`✗ FAIL: Unexpected error on over-limit: ${e.message}`, COLORS.RED);
            }
        }

        // Test C: Past Date Booking
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yDateStr = yesterday.toISOString().split('T')[0];
        try {
            await axios.post(`${API_URL}/api/student/select`, {
                date: yDateStr,
                mealType: 'breakfast',
                items: [{ _id: validDishId, itemName: dish.foodName, quantity: 1 }]
            }, getHeaders(studentCookie));
            log('✗ FAIL: Past date booking was allowed!', COLORS.RED);
        } catch (e) {
            if (e.response && e.response.status === 400) {
                log('✓ PASS: Past Date Booking Rejected', COLORS.GREEN);
            } else {
                log(`✗ FAIL: Unexpected error on past date: ${e.message}`, COLORS.RED);
            }
        }

        // Test D: Duplicate/Upsert (Updates existing booking)
        await axios.post(`${API_URL}/api/student/select`, {
            date: tDateStr,
            mealType: 'breakfast',
            items: [{ _id: validDishId, itemName: dish.foodName, quantity: 1 }]
        }, getHeaders(studentCookie));
        log('✓ PASS: Booking Update (Qty changed to 1)', COLORS.GREEN);

        // Test E: Verify GET /booking Endpoint
        const bookingRes = await axios.get(`${API_URL}/api/student/booking?date=${tDateStr}&mealType=breakfast`, getHeaders(studentCookie));
        if (bookingRes.data.booked && bookingRes.data.booking.items[0].quantity === 1) {
            log('✓ PASS: GET /booking returned correct data', COLORS.GREEN);
        } else {
            log('✗ FAIL: GET /booking failed or returned incorrect data', COLORS.RED);
            console.log(bookingRes.data);
        }

        // 4. AGGREGATION VERIFICATION
        log('\n--- PHASE 4: AGGREGATION ---', COLORS.YELLOW);

        const res = await axios.get(`${API_URL}/api/owner/preparation-summary?date=${tDateStr}`, getHeaders(ownerCookie));
        const data = res.data;

        log('Received Aggregation Data:', COLORS.CYAN);
        console.log(JSON.stringify(data, null, 2));

        const breakfastItems = data.breakfast || [];
        const targetItem = breakfastItems.find(i => i.item === 'Audit Dish');

        if (!targetItem) {
            console.log('Available Items:', JSON.stringify(breakfastItems));
            log('✗ FAIL: Item not found in aggregation summary', COLORS.RED);
            process.exit(1);
        } else if (targetItem.quantity === 1) {
            log('✓ PASS: Quantity Matches (Expected 1)', COLORS.GREEN);
        } else {
            log(`✗ FAIL: Quantity Mismatch. Expected 1, Got ${targetItem.quantity}`, COLORS.RED);
            process.exit(1);
        }

        log('\n=== AUDIT COMPLETE ===', COLORS.CYAN);
        process.exit(0);

    } catch (err) {
        log(`\nFATAL ERROR: ${err.message}`, COLORS.RED);
        if (err.response) {
            console.log('Response Data:', err.response.data);
        }
        process.exit(1);
    }
}

runAudit();
