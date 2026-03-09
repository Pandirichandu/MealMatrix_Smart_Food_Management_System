const axios = require('axios');
const BASE_URL = 'http://localhost:5003/api';

async function run() {
    console.log("Debugging /api/owner/live-stats...");

    // Login as Owner
    try {
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'owner@saveserve.com', password: '123456'
        });
        const token = loginRes.headers['set-cookie'][0].split(';')[0];
        console.log("Logged in. Token:", token.substring(0, 20) + "...");

        // Fetch Live Stats
        try {
            const res = await axios.get(`${BASE_URL}/owner/live-stats`, {
                headers: { Cookie: token },
                validateStatus: () => true // Accept all status codes
            });

            console.log("Status:", res.status);
            console.log('Connecting to MongoDB (MealMatrix)...');
            await mongoose.connect('mongodb://127.0.0.1:27017/mealmatrix');
            console.log("Type:", typeof res.data);
            console.log("Data:", res.data);

            if (res.data.totalBooked === undefined) {
                console.log("❌ totalBooked is UNDEFINED");
            } else {
                console.log("✅ totalBooked =", res.data.totalBooked);
            }

        } catch (e) {
            console.error("Fetch Error:", e.message);
        }

    } catch (e) {
        console.error("Login Failed:", e.message);
    }
}

run();
