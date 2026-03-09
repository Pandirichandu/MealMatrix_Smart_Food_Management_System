const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../server/models/User');

async function testBookingLogic() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mealmatrix');
        console.log('Connected.');
        const student = await User.findOne({ role: 'student' });
        if (!student) {
            console.log("No student found");
            return;
        }

        // We can't easily mock auth with axios without a token.
        // Let's generate a token or just test the logic directly if possible.
        // For simplicity, let's just make a POST request with a generated token.
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { user: { id: student._id, hostelId: student.hostelId, role: student.role } },
            process.env.JWT_SECRET || 'save_serve_secret_key_123',
            { expiresIn: '1h' }
        );

        console.log("Token generated for student:", student.email);

        const api = axios.create({
            baseURL: 'http://localhost:5003',
            headers: { Authorization: `Bearer ${token}` }
        });

        // 1. Fetch Today Status
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        let targetDateObj = new Date(now);
        targetDateObj.setDate(targetDateObj.getDate() + 1);
        const tYear = targetDateObj.getFullYear();
        const tMonth = String(targetDateObj.getMonth() + 1).padStart(2, '0');
        const tDay = String(targetDateObj.getDate()).padStart(2, '0');
        const tomorrowStr = `${tYear}-${tMonth}-${tDay}`;

        console.log(`\nTesting Today Status (${todayStr}):`);
        const todayRes = await api.get(`/api/student/meal-status?date=${todayStr}`);
        console.log(JSON.stringify(todayRes.data.statuses, null, 2));

        console.log(`\nTesting Tomorrow Status (${tomorrowStr}):`);
        const tomorrowRes = await api.get(`/api/student/meal-status?date=${tomorrowStr}`);
        console.log(JSON.stringify(tomorrowRes.data.statuses, null, 2));

        // Test Late Booking Attempt (LIMITED) if applicable
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const cMins = currentHour * 60 + currentMinute;

        let testMeal = null;
        if (cMins < 5 * 60) testMeal = 'breakfast';
        else if (cMins < 9 * 60 + 30) testMeal = 'lunch';
        else if (cMins < 14 * 60 + 30) testMeal = 'dinner';

        if (testMeal) {
            console.log(`\nAttempting Late Booking for ${testMeal} today...`);
            const bookRes = await api.post(`/api/student/select`, {
                date: todayStr,
                mealType: testMeal,
                items: [] // Should bypass and assign generic meal
            });
            console.log("Late Booking Response:", JSON.stringify(bookRes.data, null, 2));
        } else {
            console.log(`\nAttempting Closed Booking for dinner today (should fail)...`);
            try {
                const failRes = await api.post(`/api/student/select`, {
                    date: todayStr,
                    mealType: 'dinner',
                    items: []
                });
                console.log(failRes.data);
            } catch (e) {
                console.log("Properly Rejected:", e.response.data);
            }
        }

        console.log(`\nAttempting Advance Booking for Tomorrow breakfast...`);
        try {
            const advRes = await api.post(`/api/student/select`, {
                date: tomorrowStr,
                mealType: 'breakfast',
                action: 'skip' // Try skip first to see if it clears
            });
            console.log("Advance Skip Response:", JSON.stringify(advRes.data, null, 2));
        } catch (e) {
            console.error("Advance Booking Error:", e.response?.data || e.message);
        }

    } catch (e) {
        console.error("Test execution failed:", e.response?.data || e.message);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

testBookingLogic();
