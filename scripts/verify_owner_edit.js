const axios = require('axios');

// API Config
const API_URL = 'http://localhost:5003/api';

async function run() {
    try {
        console.log("1. Logging in as Owner...");
        // simple login - assumes owner exists. 
        // If not, we might need to create one or use a known one. 
        // Based on previous logs, owner@example.com / password123 is valid.
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'owner@example.com',
            password: 'password123',
            role: 'owner'
        });
        // Token is in Set-Cookie header, not body
        let token = null;
        const setCookie = loginRes.headers['set-cookie'];
        if (setCookie) {
            // Find token cookie
            const tokenCookie = setCookie.find(c => c.startsWith('token='));
            if (tokenCookie) {
                token = tokenCookie.split(';')[0].split('=')[1];
            }
        }

        console.log("Token extracted from Cookie:", token ? token.substring(0, 10) + "..." : "NONE");

        if (!token) {
            console.error("❌ FAILED: Login success but no token cookie found.");
            return;
        }

        // The backend uses a token in Cookie 'token' OR x-auth-token header. 
        const config = {
            headers: {
                'x-auth-token': token,
                'Content-Type': 'application/json'
            }
        };

        const TEST_DATE = "2026-02-15"; // Future date
        const TEST_MEAL = "lunch";

        console.log(`2. Creating Initial Menu for ${TEST_DATE} ${TEST_MEAL}...`);
        // Initial Save
        await axios.post(`${API_URL}/owner/save-menu`, {
            date: TEST_DATE,
            mealType: TEST_MEAL,
            vegItems: [{ foodName: "Rice", imageUrl: "/img.jpg", vegOrNonVeg: "veg", price: 50, maxQuantity: 5 }],
            nonVegItems: []
        }, config);

        console.log("3. Fetching Menu to Verify (Simulating Edit Mode)...");
        const fetchRes = await axios.get(`${API_URL}/owner/menu`, {
            params: { date: TEST_DATE, mealType: TEST_MEAL },
            headers: { 'x-auth-token': token }
        });

        if (fetchRes.data.vegItems[0].foodName === "Rice" && fetchRes.data.vegItems[0].maxQuantity === 5) {
            console.log("✅ PASSED: Menu fetched correctly with maxQuantity.");
        } else {
            console.error("❌ FAILED: Fetched menu data mismatch.", fetchRes.data);
            return;
        }

        console.log("4. Updating Menu (Adding Item, Changing Quantity)...");
        await axios.post(`${API_URL}/owner/save-menu`, {
            date: TEST_DATE,
            mealType: TEST_MEAL,
            vegItems: [
                { foodName: "Rice", imageUrl: "/img.jpg", vegOrNonVeg: "veg", price: 50, maxQuantity: 2 }, // Changed Qty
                { foodName: "Dal", imageUrl: "/img.jpg", vegOrNonVeg: "veg", price: 40, maxQuantity: 1 }   // Added Item
            ],
            nonVegItems: []
        }, config);

        console.log("5. Fetching Menu Again to Verify Update...");
        const updateRes = await axios.get(`${API_URL}/owner/menu`, {
            params: { date: TEST_DATE, mealType: TEST_MEAL },
            headers: { 'x-auth-token': token }
        });

        const items = updateRes.data.vegItems;
        const rice = items.find(i => i.foodName === "Rice");
        const dal = items.find(i => i.foodName === "Dal");

        if (items.length === 2 && rice.maxQuantity === 2 && dal) {
            console.log("✅ PASSED: Menu updated correctly (UPSERT). No duplicates.");
        } else {
            console.error("❌ FAILED: Update verification failed.", items);
        }

    } catch (e) {
        console.error("❌ FAILED: Script error", e.response ? e.response.data : e.message);
    }
}

run();
