const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../server/models/User');
const Hostel = require('../server/models/Hostel');
const MealBooking = require('../server/models/MealBooking');
const Attendance = require('../server/models/Attendance');
require('dotenv').config();

const API_URL = 'http://localhost:5003/api/owner/attendance';
const LOGIN_URL = 'http://localhost:5003/api/auth/login';

async function runTest() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false });
        console.log('Connected to MongoDB');

        // 1. Create Test Data
        const hostel = await Hostel.create({
            name: 'Test Hostel Attendance',
            totalRooms: 100, // Correct field name
            location: 'Test Location' // Required field
        });
        console.log('Created Hostel:', hostel._id);

        const owner = await User.create({
            name: 'Test Owner',
            email: `owner_${Date.now()}@test.com`,
            password: 'password123',
            role: 'owner',
            hostelId: hostel._id
        });
        console.log('Created Owner:', owner.email);

        const student = await User.create({
            name: 'Test Student',
            email: `student_${Date.now()}@test.com`,
            password: 'password123',
            role: 'student',
            hostelId: hostel._id,
            studentId: `STU_${Date.now()}`
        });
        console.log('Created Student:', student.studentId);

        // 2. Create Booking & Attendance
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];

        await MealBooking.create({
            studentId: student._id,
            hostelId: hostel._id,
            date: today,
            mealType: 'lunch',
            items: [{ itemName: 'Test Curry', quantity: 1, vegOrNonVeg: 'veg' }]
        });
        console.log('Created MealBooking');

        await Attendance.create({
            studentId: student._id,
            hostelId: hostel._id,
            date: today,
            mealType: 'lunch',
            scannedAt: new Date()
        });
        console.log('Created Attendance');

        // 3. Login
        console.log('Logging in...');
        const loginRes = await axios.post(LOGIN_URL, {
            email: owner.email,
            password: 'password123'
        });
        const token = loginRes.data.token;

        // 4. Test API
        console.log('Calling Attendance API...');
        const res = await axios.get(API_URL, {
            params: {
                date: dateStr,
                mealType: 'Lunch'
            },
            headers: { 'x-auth-token': token }
        });

        console.log('API Status:', res.status);
        console.log('Summary:', res.data.summary);
        console.log('Records:', res.data.records.length);
        if (res.data.records.length > 0) {
            console.log('Record Status:', res.data.records[0].status); // Expect "Present"
        }

        // 5. Cleanup
        await User.deleteMany({ _id: { $in: [owner._id, student._id] } });
        await Hostel.deleteOne({ _id: hostel._id });
        await MealBooking.deleteMany({ hostelId: hostel._id });
        await Attendance.deleteMany({ hostelId: hostel._id });
        console.log('Cleanup Complete');

    } catch (err) {
        console.error('TEST FAIL:', err.message);
        if (err.response) console.error('Response:', err.response.data);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
