const axios = require('axios');
const API_URL = 'http://localhost:5003';

async function verifyAdminMenu() {
    try {
        // 1. Login as Admin
        console.log("Logging in as Admin...");
        const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
            email: 'admin@saveserve.com',
            password: '123456'
        });

        const token = loginRes.data.token; // Or cookie? The app uses cookies.
        const cookie = loginRes.headers['set-cookie'];

        console.log("Login successful. Fetching Admin Menu...");

        // 2. Fetch Weekly Menu
        const menuRes = await axios.get(`${API_URL}/api/admin/menu/weekly`, {
            headers: {
                Cookie: cookie
            }
        });

        console.log("Response Status:", menuRes.status);
        console.log("Response Data keys:", Object.keys(menuRes.data));

        if (menuRes.status === 200 && menuRes.data.menu) {
            console.log("✅ SUCCESS: Admin Menu loaded successfully.");
            console.log("Menu structure:", JSON.stringify(menuRes.data.menu, null, 2).substring(0, 200) + "...");
        } else {
            console.error("❌ FAIL: Invalid response format.");
            process.exit(1);
        }

    } catch (error) {
        if (error.response) {
            console.error("❌ REQUEST FAILED:", error.response.status, error.response.data);
            if (error.response.status === 401) console.log("Note: strictly check if admin@example.com / password123 exists.");
        } else {
            console.error("❌ NETWORK ERROR:", error.message);
        }
        process.exit(1);
    }
}

verifyAdminMenu();
