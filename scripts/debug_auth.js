const axios = require('axios');
const API_URL = 'http://localhost:5003/api';

async function testAuth() {
    try {
        console.log('--- Testing Admin Login ---');
        console.log('URL:', `${API_URL}/auth/login`);
        console.log('Creds:', { email: 'admin@mealmatrix.com', password: '***' });

        const res = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@mealmatrix.com',
            password: '123456'
        });
        console.log('Status:', res.status);
        console.log('Success:', res.data.success);
        console.log('User:', res.data.user);
    } catch (e) {
        console.log('Error Status:', e.response?.status);
        console.log('Error Data:', e.response?.data);
    }
}

testAuth();
