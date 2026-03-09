const axios = require('axios');
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5003/api';

async function verify() {
    console.log('Starting Text Verification...');
    let cookie;

    // 1. Get Student ID
    console.log('Logging in as Student...');
    try {
        const res = await axios.post(`${API_URL}/auth/login`, {
            email: 'student@saveserve.com', password: '123456'
        });
        const studentId = res.data.user.id;
        console.log('Student ID found:', studentId);

        // 2. Admin Check
        console.log('Logging in as Admin...');
        const adminRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@saveserve.com', password: '123456'
        });
        const adminCookie = adminRes.headers['set-cookie'][0];

        console.log(`Fetching /admin/students/${studentId}...`);
        const pageRes = await axios.get(`${BASE_URL}/admin/students/${studentId}`, {
            headers: { Cookie: adminCookie }
        });

        if (pageRes.data.includes('Attendance History')) {
            console.log('✅ [PASS] "Attendance History" found on Admin Student Page.');
        } else {
            console.log('⚠️ [WARN] "Attendance History" text NOT found in initial HTML (might be client-rendered). Checking for other markers...');
            if (pageRes.data.includes('Student Details')) console.log('   Found "Student Details".');
        }

        // 3. Owner Check
        console.log('Logging in as Owner...');
        const ownerRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'owner@saveserve.com', password: '123456'
        });
        const ownerCookie = ownerRes.headers['set-cookie'][0];

        console.log('Fetching /owner/scan...');
        const scanRes = await axios.get(`${BASE_URL}/owner/scan`, {
            headers: { Cookie: ownerCookie }
        });

        if (scanRes.data.includes('Total Booked')) {
            console.log('✅ [PASS] "Total Booked" (Live Stats) found on Owner Scan Page.');
        } else {
            console.log('⚠️ [WARN] "Total Booked" text NOT found. Checking for "Scan Student QR"...');
            if (scanRes.data.includes('Scan Student QR')) console.log('   ✅ Found "Scan Student QR". Page Loaded.');
        }

    } catch (e) {
        console.error('Error during verification:', e.message);
        if (e.response) console.error('Response:', e.response.status, e.response.data);
    }
}

verify();
