const axios = require('axios');
const mongoose = require('mongoose');

const API_URL = 'http://localhost:5003/api';
const OWNER_CREDS = { email: 'owner@mealmatrix.com', password: '123456' };
const STUDENT_CREDS = { email: 'student@mealmatrix.com', password: '123456' };

async function verifyFeedback() {
    console.log("=== Verifying Feedback Logic ===");

    try {
        // 1. LOGIN STUDENT & SUBMIT FEEDBACK
        console.log("1. Logging in Student...");
        const studRes = await axios.post(`${API_URL}/auth/login`, STUDENT_CREDS);
        const studCookie = studRes.headers['set-cookie'][0];
        const studHeaders = { headers: { 'Cookie': studCookie }, withCredentials: true };

        console.log("   Submitting Feedback...");
        const feedbackPayload = {
            rating: 5,
            comment: `Verification Feedback ${Date.now()}`,
            mealType: 'lunch'
        };
        await axios.post(`${API_URL}/student/feedback`, feedbackPayload, studHeaders);
        console.log("   Feedback Submitted.");

        // 2. LOGIN OWNER & FETCH FEEDBACK
        console.log("\n2. Logging in Owner...");
        const ownerRes = await axios.post(`${API_URL}/auth/login`, OWNER_CREDS);
        const ownerCookie = ownerRes.headers['set-cookie'][0];
        const ownerHeaders = { headers: { 'Cookie': ownerCookie }, withCredentials: true };

        console.log("   Fetching Feedback...");
        const feedRes = await axios.get(`${API_URL}/owner/feedback`, ownerHeaders);

        const found = feedRes.data.find(f => f.comment === feedbackPayload.comment);

        if (found) {
            console.log("   SUCCESS! Found submitted feedback.");
            console.log(`   Student: ${found.studentId.name}`);
            console.log(`   Rating: ${found.rating}`);
        } else {
            console.log("   FAILURE: Feedback not found in owner list.");
            console.log("   List:", feedRes.data.map(f => f.comment));
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

verifyFeedback();
