const axios = require('axios');
const mongoose = require('mongoose');

const API_URL = 'http://localhost:5003/api';
const OWNER_CREDS = { email: 'owner@mealmatrix.com', password: '123456' };

async function verifyOwnerRoutes() {
    console.log("=== Verifying Owner Routes ===");

    try {
        // 1. LOGIN OWNER
        console.log("1. Logging in Owner...");
        const loginRes = await axios.post(`${API_URL}/auth/login`, OWNER_CREDS);
        const cookie = loginRes.headers['set-cookie'][0];
        const headers = {
            headers: {
                'Cookie': cookie,
                'Content-Type': 'application/json'
            },
            withCredentials: true
        };
        console.log("   Owner Logged In.");

        // 2. GET /students
        console.log("\n2. Testing GET /owner/students ...");
        try {
            const studentsRes = await axios.get(`${API_URL}/owner/students`, headers);
            console.log(`   Success! Found ${studentsRes.data.totalStudents} students.`);
            if (studentsRes.data.students.length > 0) {
                console.log(`   Sample Student: ${studentsRes.data.students[0].name} (${studentsRes.data.students[0].status})`);
            } else {
                console.log("   (No students found, but route works)");
            }
        } catch (e) {
            console.error(`   FAILED: ${e.message}`);
            if (e.response) console.error(e.response.data);
            process.exit(1);
        }

        // 3. GET /live-stats
        console.log("\n3. Testing GET /owner/live-stats ...");
        try {
            const statsRes = await axios.get(`${API_URL}/owner/live-stats`, headers);
            console.log("   Success! Live Stats:", statsRes.data);
            if (statsRes.data.totalBooked !== undefined && statsRes.data.remaining !== undefined) {
                console.log("   Structure Valid.");
            } else {
                console.log("   WARNING: Unexpected structure.");
            }
        } catch (e) {
            console.error(`   FAILED: ${e.message}`);
            if (e.response) console.error(e.response.data);
            process.exit(1);
        }

        console.log("\n=== Verification Successful! ===");
        process.exit(0);

    } catch (err) {
        console.error("Verification Error:", err.message);
        if (err.response) console.error(err.response.data);
        process.exit(1);
    }
}

verifyOwnerRoutes();
