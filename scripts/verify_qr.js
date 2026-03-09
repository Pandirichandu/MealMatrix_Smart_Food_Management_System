const axios = require('axios');
const API_URL = 'http://localhost:5003/api';

async function runTest() {
    try {
        console.log('--- 1. Login Admin ---');
        const adminRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@saveserve.com',
            password: '123456' // assuming this is the password from seed
        });
        const adminToken = adminRes.headers['set-cookie'][0].split(';')[0].split('=')[1];
        console.log('Admin Logged In. Token:', adminToken.substring(0, 10) + '...');

        console.log('\n--- 2. Get Hostels ---');
        const hostelsRes = await axios.get(`${API_URL}/admin/hostels`, {
            headers: { Cookie: `token=${adminToken}` }
        });
        const hostelId = hostelsRes.data[0]._id;
        console.log('Hostel ID:', hostelId);

        console.log('\n--- 3. Create Student ---');
        const studentId = 'QRTEST' + Math.floor(Math.random() * 1000);
        const studentEmail = `qrtest${Math.floor(Math.random() * 1000)}@saveserve.com`;
        try {
            await axios.post(`${API_URL}/admin/students`, {
                name: 'QR Test Student',
                email: studentEmail,
                password: '123456',
                studentId: studentId,
                hostelId: hostelId
            }, {
                headers: { Cookie: `token=${adminToken}` }
            });
            console.log(`Student Created: ${studentId} / ${studentEmail}`);
        } catch (e) {
            console.log('Student Creation Failed (might exist):', e.response?.data || e.message);
        }

        console.log('\n--- 4. Login Student ---');
        const studentRes = await axios.post(`${API_URL}/auth/login`, {
            email: studentEmail,
            password: '123456'
        });
        const studentToken = studentRes.headers['set-cookie'][0].split(';')[0].split('=')[1];
        console.log('Student Logged In.');

        console.log('\n--- 5. Get QR Data ---');
        const qrRes = await axios.get(`${API_URL}/student/qr`, {
            headers: { Cookie: `token=${studentToken}` }
        });
        console.log('QR Response:', qrRes.data);
        const qrData = JSON.parse(qrRes.data.qrData);
        console.log('Parsed QR Data:', qrData);

        if (qrData.studentId !== studentId) {
            throw new Error(`Mismatch! Expected ${studentId}, got ${qrData.studentId}`);
        }

        console.log('\n--- 5b. Get Owners List ---');
        const ownersList = await axios.get(`${API_URL}/admin/owners`, {
            headers: { Cookie: `token=${adminToken}` }
        });
        console.log('Owners Found:', ownersList.data.map(o => ({ email: o.email, role: o.role })));

        console.log('\n--- 6. Login Owner ---');
        const ownerRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'owner@saveserve.com',
            password: '123456'
        });
        const ownerToken = ownerRes.headers['set-cookie'][0].split(';')[0].split('=')[1];
        console.log('Owner Logged In.');

        console.log('\n--- 7. Scan QR ---');
        // Test 1: JSON QR (Simulate Scan)
        try {
            const scanRes = await axios.post(`${API_URL}/owner/scan`, {
                qrData: JSON.stringify(qrData)
            }, {
                headers: { Cookie: `token=${ownerToken}` }
            });
            console.log('Scan Result (JSON):', scanRes.data);
        } catch (e) {
            console.log('Scan Failed (JSON):', e.response?.data || e.message);
        }

        // Test 2: Manual Student ID
        try {
            const manualRes = await axios.post(`${API_URL}/owner/scan`, {
                qrData: studentId
            }, {
                headers: { Cookie: `token=${ownerToken}` }
            });
            console.log('Scan Result (Manual):', manualRes.data);
        } catch (e) {
            // Expected to fail if already scanned above (duplicate attendance)
            console.log('Scan Result (Manual):', e.response?.data?.msg); // Should say "Already scanned!"
        }
    } catch (err) {
        console.error('Test Failed:', err.response?.data || err.message);
    }
}

// I'll fix passwords in the actual run if needed.
// Seed says: const password = await bcrypt.hash('123456', salt);
// So I should use '123456' for all.

runTest();
