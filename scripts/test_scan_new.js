const axios = require('axios');
const API_URL = 'http://localhost:5003/api';

async function runTest() {
    try {
        console.log('--- 1. Login Admin ---');
        const adminRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@mealmatrix.com',
            password: '123456'
        });
        const adminToken = adminRes.headers['set-cookie'][0].split(';')[0].split('=')[1];
        console.log('Admin Logged In');

        console.log('\n--- 2. Get Hostels ---');
        const hostelsRes = await axios.get(`${API_URL}/admin/hostels`, {
            headers: { Cookie: `token=${adminToken}` }
        });
        const hostelId = hostelsRes.data[0]._id;
        console.log('Got Hostel ID:', hostelId);

        console.log('\n--- 3. Create Student ---');
        const uniqueId = Date.now().toString().slice(-6);
        const studentId = 'TEST_' + uniqueId;
        const studentEmail = `test_${uniqueId}@mealmatrix.com`;

        await axios.post(`${API_URL}/admin/students`, {
            name: 'Test Student',
            email: studentEmail,
            password: '123456',
            studentId: studentId,
            hostelId: hostelId
        }, {
            headers: { Cookie: `token=${adminToken}` }
        });
        console.log(`Student Created: ${studentId} (${studentEmail})`);

        // Wait for propagation just in case
        await new Promise(r => setTimeout(r, 1000));

        console.log('\n--- 4. Login Student ---');
        const studentRes = await axios.post(`${API_URL}/auth/login`, {
            email: studentEmail,
            password: '123456'
        });
        const studentToken = studentRes.headers['set-cookie'][0].split(';')[0].split('=')[1];
        console.log('Student Logged In');

        console.log('\n--- 5. Login Owner ---');
        const ownerRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'owner@mealmatrix.com',
            password: '123456'
        });
        const ownerToken = ownerRes.headers['set-cookie'][0].split(';')[0].split('=')[1];
        console.log('Owner Logged In');

        console.log('\n--- 6. Scan QR ---');
        try {
            await axios.post(`${API_URL}/owner/scan`, {
                qrData: studentId
            }, {
                headers: { Cookie: `token=${ownerToken}` }
            });
            console.log('Scan Success (Parsed)');
        } catch (e) {
            // We expect potential logic error (Not Opted In) but passing parsing
            const msg = e.response?.data?.msg;
            console.log('Scan Result:', msg);
        }

    } catch (err) {
        console.error('CRITICAL FAILURE:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

runTest();
