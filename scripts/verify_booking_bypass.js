const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../server/models/User');
const Settings = require('../server/models/Settings');

async function runAudit() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB.");
        await new Promise(resolve => setTimeout(resolve, 500));

        const student = await User.findOne({ role: 'student' });
        if (!student) throw new Error("No student found");

        const payload = {
            user: {
                id: student.id,
                role: student.role,
                hostelId: student.hostelId
            }
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        const baseUrl = 'http://localhost:5005/api/student/select';

        async function attemptBooking(dateStr, mealType) {
            try {
                const res = await axios.post(baseUrl, {
                    date: dateStr,
                    mealType: mealType,
                    items: [{ itemName: 'TestItem', quantity: 1 }]
                }, {
                    headers: { 'x-auth-token': token }
                });
                return { status: res.status, msg: res.data.msg };
            } catch (error) {
                if (error.response) {
                    return { status: error.response.status, msg: error.response.data.msg || "Error" };
                }
                return { status: 500, msg: error.message };
            }
        }

        console.log("\n--- CONDITION 2 & 3: Bypass Simulation (Past Cutoff) ---");

        let settings = await Settings.findOne();
        if (!settings) settings = new Settings();

        const nowLocal = new Date();
        const pastHour = nowLocal.getHours() === 0 ? 23 : nowLocal.getHours() - 1;
        const pastTimeStr = `${String(pastHour).padStart(2, '0')}:00`;

        const futureHour = nowLocal.getHours() === 23 ? 0 : nowLocal.getHours() + 1;
        const futureTimeStr = `${String(futureHour).padStart(2, '0')}:59`;

        settings.mealCutoffTimes = {
            breakfast: { dayOffset: -1, time: pastTimeStr },
            lunch: { dayOffset: 0, time: "12:30" },
            dinner: { dayOffset: 0, time: "19:30" }
        };
        await settings.save();
        console.log(`Updated settings: Breakfast cutoff is Previous Day ${pastTimeStr} (Currently Past)`);

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        let result = await attemptBooking(tomorrowStr, 'breakfast');
        console.log(`Booking Result (Expected Rejected Cutoff): Status ${result.status}, Msg: ${result.msg}`);

        const todayStr = new Date().toISOString().split('T')[0];
        console.log("\n--- CONDITION 4: Edge Case Validation ---");
        console.log("Testing Same-Day Cutoff (Today's Dinner at 19:30)...");
        result = await attemptBooking(todayStr, 'dinner');
        console.log(`Booking Result (Expected Rejected Cutoff): Status ${result.status}, Msg: ${result.msg}`);

        settings.mealCutoffTimes.breakfast = { dayOffset: -1, time: futureTimeStr };
        await settings.save();
        console.log(`\nTesting valid booking before cutoff (Previous Day ${futureTimeStr})...`);
        result = await attemptBooking(tomorrowStr, 'breakfast');
        console.log(`Booking Result (Expected Allowed - Fails at Menu Check Instead): Status ${result.status}, Msg: ${result.msg}`);

        console.log("\nTesting invalid mealtype...");
        result = await attemptBooking(tomorrowStr, 'invalid_meal');
        console.log(`Invalid MealType Result: Status ${result.status}, Msg: ${result.msg}`);

        console.log("\nDone.");
    } catch (err) {
        console.error("Test Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}
runAudit();
