const axios = require('axios');
const mongoose = require('mongoose');

const API_URL = 'http://localhost:5003/api/owner/attendance';
const LOGIN_URL = 'http://localhost:5003/api/auth/login';

async function verifyAttendanceAPI() {
    try {
        console.log('1. Logging in as Owner...');
        const loginRes = await axios.post(LOGIN_URL, {
            email: 'owner@mealmatrix.com', // Replace with valid owner email
            password: 'password123'      // Replace with valid password
        });
        const token = loginRes.data.token;
        console.log('   Logged in successfully.');

        console.log('\n2. Fetching Attendance (Today, Lunch)...');
        const today = new Date().toISOString().split('T')[0];
        const res = await axios.get(API_URL, {
            params: {
                date: today,
                mealType: 'Lunch'
            },
            headers: { 'x-auth-token': token }
        });

        console.log('   Response Status:', res.status);
        console.log('   Summary:', res.data.summary);
        console.log('   Records Count:', res.data.records.length);
        if (res.data.records.length > 0) {
            console.log('   Sample Record:', res.data.records[0]);
        }

        console.log('\n3. Fetching Attendance (Future Date)...');
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 5);
        const futureDateStr = futureDate.toISOString().split('T')[0];

        const futureRes = await axios.get(API_URL, {
            params: {
                date: futureDateStr,
                mealType: 'Lunch'
            },
            headers: { 'x-auth-token': token }
        });
        console.log('   Response Logic:', futureRes.data.msg);

    } catch (err) {
        console.error('ERROR:', err.response ? err.response.data : err.message);
    }
}

verifyAttendanceAPI();
