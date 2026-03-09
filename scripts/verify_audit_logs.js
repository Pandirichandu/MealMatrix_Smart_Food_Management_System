const axios = require('axios');
const API_URL = 'http://localhost:5003/api';

async function runTest() {
    try {
        console.log('--- 1. Trigger Audit Log (Failed Login) ---');
        try {
            await axios.post(`${API_URL}/auth/login`, {
                email: 'admin@mealmatrix.com',
                password: 'WRONG_PASSWORD'
            });
        } catch (e) {
            console.log('Login failed as expected (Log created).');
        }

        console.log('\n--- 2. Login Admin (Success) ---');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@mealmatrix.com',
            password: '123456'
        });
        const token = loginRes.headers['set-cookie'][0].split(';')[0].split('=')[1];
        console.log('Logged in successfully.');

        console.log('\n--- 3. Verify Pagination ---');
        const resPage1 = await axios.get(`${API_URL}/admin/audit-logs?page=1&limit=5`, {
            headers: { Cookie: `token=${token}` }
        });
        console.log(`Page 1 Logs: ${resPage1.data.logs.length}`);
        console.log(`Total Logs: ${resPage1.data.totalLogs}`);

        console.log('\n--- 4. Verify Search (Action: LOGIN_FAILED) ---');
        const resSearch = await axios.get(`${API_URL}/admin/audit-logs?action=LOGIN_FAILED`, {
            headers: { Cookie: `token=${token}` }
        });
        const found = resSearch.data.logs.find(l => l.action === 'LOGIN_FAILED');
        if (found) {
            console.log('✅ Found LOGIN_FAILED log.');
            console.log('   IP:', found.ipAddress);
            console.log('   User Agent:', found.userAgent);
        } else {
            console.log('❌ LOGIN_FAILED log not found.');
        }

        console.log('\n--- 5. Verify CSV Export ---');
        const resExport = await axios.get(`${API_URL}/admin/audit-logs/export`, {
            headers: { Cookie: `token=${token}` },
            responseType: 'text'
        });
        if (resExport.data.startsWith('Timestamp,Action')) {
            console.log('✅ CSV Export success. Header found.');
            console.log('First line:', resExport.data.split('\n')[0]);
        } else {
            console.log('❌ CSV Export failed.');
        }

    } catch (err) {
        console.error('Verification Error:', err.message);
        if (err.response) console.error(err.response.data);
    }
}

runTest();
