const axios = require('axios');
const API_URL = 'http://localhost:5003/api';

async function verifyBooking() {
    try {
        console.log('--- 1. Authenticating as Admin to find a Student ---');
        let adminRes;
        try {
            adminRes = await axios.post(`${API_URL}/auth/login`, {
                email: 'admin@mealmatrix.com',
                password: '123456'
            });
            console.log('Admin Login Success');
        } catch (e) {
            console.error('Admin Login Failed', e.response?.data);
            return;
        }

        let adminToken;
        const cookies = adminRes.headers['set-cookie'];
        if (cookies) {
            const tokenCookie = cookies.find(c => c.startsWith('token='));
            if (tokenCookie) {
                adminToken = tokenCookie.split(';')[0].split('=')[1];
            }
        }

        console.log('Admin Token Sample:', adminToken ? adminToken.substring(0, 10) : 'UNDEFINED');

        // Let's get a student from the system using admin token
        let studentsRes;
        try {
            studentsRes = await axios.get(`${API_URL}/admin/students`, {
                headers: { 'x-auth-token': adminToken }
            });
        } catch (e) {
            console.error('Fetch Students Failed:', e.response?.data);
            return;
        }

        const students = studentsRes.data;
        if (!students || students.length === 0) {
            console.error('No students found in the database.');
            return;
        }

        const student = students[0];
        console.log(`Found Student: ${student.email}`);

        let studentToken;
        try {
            console.log(`Attempting login for ${student.email} with common password...`);
            const stuRes = await axios.post(`${API_URL}/auth/login`, {
                email: student.email,
                password: 'password123'
            });
            const cookies = stuRes.headers['set-cookie'];
            if (cookies) {
                const tokenCookie = cookies.find(c => c.startsWith('token='));
                if (tokenCookie) studentToken = tokenCookie.split(';')[0].split('=')[1];
            }
            console.log('Student Login Success (password123)');
        } catch (e) {
            console.log('Failed with password123, trying 123456...');
            try {
                const stuRes = await axios.post(`${API_URL}/auth/login`, {
                    email: student.email,
                    password: '123456'
                });
                const cookies = stuRes.headers['set-cookie'];
                if (cookies) {
                    const tokenCookie = cookies.find(c => c.startsWith('token='));
                    if (tokenCookie) studentToken = tokenCookie.split(';')[0].split('=')[1];
                }
                console.log('Student Login Success (123456)');
            } catch (e2) {
                console.error('Could not guess student password. We need a token to test.');
                return;
            }
        }

        const api = axios.create({
            baseURL: API_URL,
            headers: { 'x-auth-token': studentToken }
        });

        const now = new Date();
        console.log(`\n--- CURRENT SERVER TIME ---`);
        console.log(`Local Time: ${now.toString()}`);
        console.log(`UTC Time: ${now.toISOString()}`);

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

        console.log(`\n--- 2. Fetching Today Status (${todayStr}) ---`);
        const todayRes = await api.get(`/student/meal-status?date=${todayStr}`);
        console.log(JSON.stringify(todayRes.data.statuses, null, 2));

        console.log(`\n--- 3. Fetching Tomorrow Status (${tomorrowStr}) ---`);
        const tomorrowRes = await api.get(`/student/meal-status?date=${tomorrowStr}`);
        console.log(JSON.stringify(tomorrowRes.data.statuses, null, 2));

        // Let's test the booking endpoint
        console.log(`\n--- 4. Testing Booking Rules ---`);

        // Test Tomorrow (Advance) - should be OPEN
        console.log(`\nAttempting Tomorrow Advance Booking (Breakfast) - Should be OPEN`);

        // 1. First, explicitly set intention to skip
        console.log(`Setting intention to 'not_coming' (Skip) for Tomorrow's Breakfast...`);
        try {
            await api.post(`/student/meal-intention`, {
                date: tomorrowStr,
                mealType: 'breakfast',
                status: 'not_coming'
            });
            console.log("Intention set successfully.");
        } catch (e) {
            console.error("Failed to set intention:", e.response?.data);
        }

        // 2. Try to book an item while skipped
        console.log(`Attempting to book items after Skipping (Should fail with 400)...`);
        try {
            // Let's pass a dummy item structure just to bypass the empty cart check
            const tomBookRes = await api.post(`/student/select`, {
                date: tomorrowStr,
                mealType: 'breakfast',
                items: [{ _id: 'dummy_id_123', itemName: 'Dummy Item', quantity: 1 }]
            });
            console.log("Unexpected Success Response:", tomBookRes.data);
        } catch (e) {
            console.log("Expected Error Response:", e.response?.data);
        }

        // 3. Revert to 'present'
        console.log(`Reverting intention to 'present'...`);
        try {
            await api.post(`/student/meal-intention`, {
                date: tomorrowStr,
                mealType: 'breakfast',
                status: 'present'
            });
            console.log("Intention reverted to present successfully.");
        } catch (e) {
            console.error("Failed to revert intention:", e.response?.data);
        }

        // Test Today
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const cMins = currentHour * 60 + currentMinute;

        let testMeal = null;
        if (cMins < 5 * 60) testMeal = 'breakfast';
        else if (cMins < 9 * 60 + 30) testMeal = 'lunch';
        else if (cMins < 14 * 60 + 30) testMeal = 'dinner';

        if (testMeal) {
            console.log(`\nAttempting Today Late Booking (${testMeal}) - should be LIMITED...`);
            try {
                const lateRes = await api.post(`/student/select`, {
                    date: todayStr,
                    mealType: testMeal,
                    items: [] // Late bookings ignore items anyway
                });
                console.log("Success Response:", lateRes.data);
            } catch (e) {
                console.log("Error Response:", e.response?.data);
            }
        } else {
            console.log(`\nAttempting Today Closed Booking (Dinner) - should be CLOSED (Error Expected)...`);
            try {
                const closeRes = await api.post(`/student/select`, {
                    date: todayStr,
                    mealType: 'dinner',
                    items: []
                });
                console.log("Unexpected Success Response:", closeRes.data);
            } catch (e) {
                console.log("Expected Error Response:", e.response?.data);
            }
        }

        console.log(`\n--- Test Complete ---`);

    } catch (err) {
        console.error("Script failed:", err.message);
    }
}

verifyBooking();
