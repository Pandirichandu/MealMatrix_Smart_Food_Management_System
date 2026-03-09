/* eslint-disable @typescript-eslint/no-require-imports */
const axios = require('axios');

const API_URL = 'http://localhost:5003'; // Updated to match server port

// Credentials from seed.js
const OWNER_CREDS = { email: 'owner@mealmatrix.com', password: '123456' };
const STUDENT_CREDS = { email: 'student@mealmatrix.com', password: '123456' };

// Helper to get headers
const getHeaders = (cookie) => ({
    headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json'
    }
});

// Helper to get tomorrow's date YYYY-MM-DD
const getTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const tomorrow = getTomorrow();

async function runVerification() {
    console.log("=== Starting System Verification ===");
    console.log(`Target Date: ${tomorrow}`);

    try {
        // 1. OWNER LOGIN
        console.log("\n1. Logging in Owner...");
        const ownerRes = await axios.post(`${API_URL}/api/auth/login`, OWNER_CREDS);
        const ownerCookie = ownerRes.headers['set-cookie'][0];
        console.log("   Owner Logged In.");

        // 1b. CHECK DASHBOARD (Sanity Check)
        console.log("\n1b. Checking Dashboard...");
        try {
            await axios.get(`${API_URL}/api/owner/dashboard`, getHeaders(ownerCookie));
            console.log("   Dashboard OK.");
        } catch (e) {
            console.log("   Dashboard Failed:", e.message);
        }

        // 2. CHECK/CREATE MENU FOR TOMORROW (Breakfast)
        console.log("\n2. Getting Existing Dishes...");
        let testDish = null;
        try {
            const dishesRes = await axios.get(`${API_URL}/api/owner/dishes`, getHeaders(ownerCookie));
            const dishes = dishesRes.data.dishes || dishesRes.data; // Handle pagination structure or plain array
            if (dishes.length > 0) {
                testDish = dishes[0];
                console.log(`   Using Existing Dish: ${testDish.foodName}`);
            }
        } catch (e) {
            console.log("   Could not fetch dishes, using fallback item.");
        }

        if (!testDish) {
            console.log("   Using Fallback Dummy Dish...");
            testDish = {
                foodName: "Verification Poha",
                imageUrl: "/menu-images/placeholder.jpg",
                vegOrNonVeg: "veg",
                price: 20
            };
        }

        console.log("   Publishing Menu for Tomorrow...");
        const menuPayload = {
            date: tomorrow,
            mealType: 'breakfast',
            vegItems: [{ ...testDish, maxQuantity: 2 }], // Set max quantity to 2
            nonVegItems: [],
            status: 'PUBLISHED'
        };

        try {
            await axios.post(`${API_URL}/api/owner/save-menu`, menuPayload, getHeaders(ownerCookie));
            console.log("   Menu Published.");
        } catch (e) {
            console.log("   Menu save error (might be duplicate/update):", e.response?.data?.msg || e.message);
        }

        // 2b. FETCH MENU TO GET ACTUAL ID
        console.log("   Fetching Saved Menu to get valid Item ID...");
        const menuRes = await axios.get(`${API_URL}/api/owner/menu?date=${tomorrow}&mealType=breakfast`, getHeaders(ownerCookie));
        const savedMenu = menuRes.data;
        const savedItem = savedMenu.vegItems.find(i => i.foodName === testDish.foodName);

        if (!savedItem) throw new Error("Saved item not found in fetched menu!");
        const validDishId = savedItem._id;
        console.log(`   Got Valid Item ID: ${validDishId}`);

        // 3. STUDENT LOGIN
        console.log("\n3. Logging in Student...");
        const studentRes = await axios.post(`${API_URL}/api/auth/login`, STUDENT_CREDS);
        const studentCookie = studentRes.headers['set-cookie'][0];
        console.log("   Student Logged In.");

        // 4. STUDENT ATTEMPT BOOKING (Valid Quantity)
        console.log("\n4. Student Booking Item (Qty: 2)...");
        const bookingPayloadValid = {
            date: tomorrow,
            mealType: 'breakfast',
            items: [
                { _id: validDishId, quantity: 2, itemName: testDish.foodName }
            ]
        };
        await axios.post(`${API_URL}/api/student/select`, bookingPayloadValid, getHeaders(studentCookie));
        console.log("   Booking Successful (Qty 2).");

        // 5. ATTEMPT BOOKING (Invalid Quantity - Exceeds Max)
        console.log("\n5. Student Attempting Over-limit Booking (Qty: 3)...");
        const bookingPayloadInvalid = {
            date: tomorrow,
            mealType: 'breakfast',
            items: [
                { _id: validDishId, quantity: 3, itemName: testDish.foodName }
            ]
        };
        try {
            await axios.post(`${API_URL}/api/student/select`, bookingPayloadInvalid, getHeaders(studentCookie));
            console.error("   FAILED: Should have rejected booking > max limit.");
        } catch (err) {
            console.log(`   Correctly Rejected: ${err.response?.data?.msg || err.message}`);
        }

        // 6. OWNER PREPARATION SUMMARY
        console.log("\n6. Owner Checking Preparation Summary...");
        const prepRes = await axios.get(`${API_URL}/api/owner/preparation-summary?date=${tomorrow}`, getHeaders(ownerCookie));
        const prepData = prepRes.data;

        console.log("   Preparation Data:", JSON.stringify(prepData, null, 2));

        const breakfastItems = prepData.breakfast || [];
        const foundItem = breakfastItems.find(i => i.item === testDish.foodName);

        if (foundItem && foundItem.quantity === 2) {
            console.log("\nSUCCESS: Verification Complete! Quantity matches.");
        } else {
            console.error("\nFAILURE: Quantity mismatch or item not found in summary.");
            console.error("Expected 2, Found:", foundItem ? foundItem.quantity : "Not Found");
        }

    } catch (err) {
        console.error("\nERROR:", err.message);
        if (err.response) {
            console.error("Response Data:", err.response.data);
        }
    }
}

runVerification();
