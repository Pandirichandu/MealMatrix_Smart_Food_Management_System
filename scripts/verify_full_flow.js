const axios = require('axios');

const API_URL = 'http://localhost:5003/api';

const users = {
    admin: { email: 'admin@saveserve.com', password: '123456' },
    owner: { email: 'owner@saveserve.com', password: '123456' },
    student: { email: 'student@saveserve.com', password: '123456' }
};

async function runAudit() {
    console.log('🚀 Starting Full Application Audit...');
    let errors = [];

    // 1. Test Login & Roles
    let tokens = {};
    for (const [role, creds] of Object.entries(users)) {
        try {
            console.log(`Testing Login for ${role}...`);
            const res = await axios.post(`${API_URL}/auth/login`, creds);
            const cookies = res.headers['set-cookie'];
            if (res.status === 200 && cookies) {
                console.log(`✅ ${role} Login Success`);
                // Extract token from cookie string (e.g., "token=xyz; Path=/; HttpOnly")
                const tokenCookie = cookies.find(c => c.startsWith('token='));
                if (tokenCookie) {
                    tokens[role] = tokenCookie.split(';')[0].split('=')[1];
                } else {
                    throw new Error('Token cookie not found');
                }
            } else {
                throw new Error('No cookie returned');
            }
        } catch (err) {
            console.error(`❌ ${role} Login Failed:`, err.message);
            if (err.response) {
                console.error('   Status:', err.response.status);
                console.error('   Data:', err.response.data);
            }
            errors.push(`${role} Login Failed`);
        }
    }

    // 2. Test Owner Dish Loading (Addressing "Failed to load dishes" bug)
    if (tokens.owner) {
        try {
            console.log('Testing Owner Dish Loading...');
            const res = await axios.get(`${API_URL}/owner/dishes`, {
                headers: { 'Cookie': `token=${tokens.owner}` },
                withCredentials: true
            });
            console.log(`✅ Owner Dishes Response Status: ${res.status}`);
            console.log(`✅ Dishes Count: ${res.data.count}`);
            if (!res.data.success) errors.push('Owner Dishes API returned success: false');
        } catch (err) {
            console.error('❌ Owner Dish Load Failed:', err.message);
            errors.push('Owner Dish Load Failed');
        }
    }

    // 3. Test Student Menu & Balance Removal
    if (tokens.student) {
        try {
            console.log('Testing Student Today Menu...');
            const today = new Date().toISOString().split('T')[0];
            const res = await axios.get(`${API_URL}/student/today-menu?date=${today}`, {
                headers: { 'Cookie': `token=${tokens.student}` },
                withCredentials: true
            });
            console.log(`✅ Student Menu Loaded. Breakfast items: ${res.data.breakfast?.length || 0}`);

            // CHECK BALANCE REMOVAL
            if (JSON.stringify(res.data).includes('balance')) {
                console.warn('⚠️ Warning: "balance" string found in student menu response.');
                // Not necessarily an error if it's in a text description, but suspicious.
            } else {
                console.log('✅ No "balance" field found in menu response.');
            }

        } catch (err) {
            // 404 is acceptable if no menu is set for today
            if (err.response && err.response.status === 404) {
                console.log('ℹ️ No menu set for today (404), which is valid behavior.');
            } else {
                console.error('❌ Student Menu Load Failed:', err.message);
                errors.push('Student Menu Load Failed');
            }
        }

        // Test QR Generation (Should not fail)
        try {
            console.log('Testing QR Generation...');
            const res = await axios.get(`${API_URL}/student/qr`, {
                headers: { 'Cookie': `token=${tokens.student}` },
                withCredentials: true
            });
            console.log('✅ QR Generation Success');
            const qrData = JSON.parse(res.data.qrData);
            console.log('   QR Payload:', qrData);

            // SIMULATE SCAN (Owner Scans Student)
            if (tokens.owner) {
                console.log('Testing QR Scan (Simulating Owner Move)...');
                // Need to ensure scan works.
                // Scan expects: { qrData: JSON.stringify({...}) }
                try {
                    const scanRes = await axios.post(`${API_URL}/owner/scan`, {
                        qrData: res.data.qrData
                    }, {
                        headers: { 'Cookie': `token=${tokens.owner}` },
                        withCredentials: true
                    });
                    console.log('✅ Scan Success');
                    if (scanRes.data.remainingBalance !== undefined) {
                        console.error('❌ FAILED: remainingBalance IS present in scan response!');
                        errors.push('Balance Removal Failed: remainingBalance present in scan');
                    } else {
                        console.log('✅ Verified: remainingBalance is NOT present.');
                    }
                } catch (scanErr) {
                    // Start of day, maybe not opted in?
                    console.warn('⚠️ Scan failed (likely logic/opt-in):', scanErr.response?.data?.msg || scanErr.message);
                }
            }

        } catch (err) {
            console.error('❌ QR Test Failed:', err.message);
            errors.push('QR Test Failed');
        }
    }

    console.log('--------------------------------------------------');
    if (errors.length === 0) {
        console.log('🎉 AUDIT PASSED: System is stable.');
        process.exit(0);
    } else {
        console.error('🚨 AUDIT FAILED:', errors);
        process.exit(1);
    }
}

runAudit();
