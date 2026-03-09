/* eslint-disable @typescript-eslint/no-require-imports */
const axios = require('axios');

const API_URL = 'http://localhost:5003';
// We need valid tokens. For this test, let's assume we can login as Owner and Student.
// Or we can mock the auth middleware if running locally? No, we are running against real server.

// 1. Login as Admin to create fresh users if needed, or just login as Owner/Student?
// Let's try to login as 'messowner@example.com' (from previous context, usually exists)
// and 'student@example.com'.

async function runTest() {
    try {
        console.log("1. Logging in as Owner...");
        const ownerRes = await axios.post(`${API_URL}/api/auth/login`, {
            email: 'owner@mealmatrix.com',
            password: '123456'
        });
        const ownerToken = ownerRes.data.token;
        const ownerCookie = ownerRes.headers['set-cookie'];
        console.log("   Owner Logged In.");

        console.log("2. Logging in as Student...");
        const studentRes = await axios.post(`${API_URL}/api/auth/login`, {
            email: 'student@mealmatrix.com', // Assuming this user exists from seeding
            password: '123456'
        });
        const studentToken = studentRes.data.token;
        const studentCookie = studentRes.headers['set-cookie'];
        console.log("   Student Logged In.");

        // 3. Prepare Dates
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tYear = tomorrow.getFullYear();
        const tMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const tDay = String(tomorrow.getDate()).padStart(2, '0');
        const tomorrowStr = `${tYear}-${tMonth}-${tDay}`;

        console.log(`\nTesting Dates: Today=${todayStr}, Tomorrow=${tomorrowStr}`);

        // 4. Save Menu for TOMORROW
        console.log(`\n3. Saving Breakfast Menu for TOMORROW (${tomorrowStr})...`);
        const menuPayload = {
            date: tomorrowStr,
            mealType: 'breakfast',
            vegItems: [
                { foodName: `Test Dosa Tomorrow`, vegOrNonVeg: 'veg', price: 50, category: 'Main' }
            ],
            nonVegItems: []
        };

        await axios.post(`${API_URL}/api/owner/save-menu`, menuPayload, {
            headers: {
                'Authorization': `Bearer ${ownerToken}`,
                'Cookie': ownerCookie
            },
            withCredentials: true
        });
        console.log("   Menu Saved.");

        // 5. Fetch Menu as Student for TOMORROW
        console.log(`\n4. Fetching Menu for TOMORROW (${tomorrowStr})...`);
        const fetchRes = await axios.get(`${API_URL}/api/student/today-menu?date=${tomorrowStr}`, {
            headers: {
                'Authorization': `Bearer ${studentToken}`,
                'Cookie': studentCookie
            },
            withCredentials: true
        });

        const menuData = fetchRes.data;
        const breakfastItems = menuData.breakfast || [];
        console.log(`   Items Found: ${breakfastItems.length}`);
        if (breakfastItems.length > 0) {
            console.log(`   Item Name: ${breakfastItems[0].foodName}`);
            if (breakfastItems[0].foodName === 'Test Dosa Tomorrow') {
                console.log("   SUCCESS: Tomorrow's menu fetched correctly!");
            } else {
                console.log("   FAILURE: Fetched wrong item!");
            }
        } else {
            console.log("   FAILURE: No items found for tomorrow!");
        }

        // 6. Check Today's menu to ensure no bleed over
        console.log(`\n5. Fetching Menu for TODAY (${todayStr})...`);
        const todayRes = await axios.get(`${API_URL}/api/student/today-menu?date=${todayStr}`, {
            headers: {
                'Authorization': `Bearer ${studentToken}`,
                'Cookie': studentCookie
            },
            withCredentials: true
        });
        const todayItems = todayRes.data.breakfast || [];
        const bleedOver = todayItems.find(i => i.foodName === 'Test Dosa Tomorrow');
        if (bleedOver) {
            console.log("   FAILURE: Tomorrow's menu bleeding into Today!");
        } else {
            console.log("   SUCCESS: Today's menu does not contain tomorrow's item.");
        }

    } catch (error) {
        console.error("TEST FAILED:", error.message);
        if (error.response) {
            console.error("Response:", error.response.data);
        }
    }
}

runTest();
