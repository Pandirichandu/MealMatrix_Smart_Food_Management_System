/* eslint-disable */
const axios = require('axios');

async function testMenuApi() {
    try {
        // First login to get token
        const loginRes = await axios.post('http://localhost:5003/api/auth/login', {
            email: 'student@saveserve.com',
            password: '123456'
        });
        const cookie = loginRes.headers['set-cookie'];

        console.log('✅ Login Successful');

        // Test Today's Menu
        const todayRes = await axios.get('http://localhost:5003/api/student/today-menu', {
            headers: { Cookie: cookie }
        });
        console.log('✅ Today Menu Fetch Success');

        // Test Filter
        const vegRes = await axios.get('http://localhost:5003/api/student/today-menu?vegOrNonVeg=veg', {
            headers: { Cookie: cookie }
        });
        console.log('✅ Veg Menu Filter Success');

    } catch (error) {
        console.error('❌ API Test Failed:', error.message);
        if (error.response) console.error(error.response.data);
    }
}

testMenuApi();
