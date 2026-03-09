/* eslint-disable */
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testEnhancedOwnerFeatures() {
    try {
        console.log('--- 1. Login as Owner ---');
        const loginRes = await axios.post('http://localhost:5003/api/auth/login', {
            email: 'owner@saveserve.com',
            password: '123456'
        });
        const cookie = loginRes.headers['set-cookie'];
        const token = loginRes.data.token;
        console.log('✅ Login Successful');

        const headers = {
            Cookie: cookie,
            Authorization: `Bearer ${token}`
        };

        console.log('\n--- 2. Test Server-Side Search (Filter by Category) ---');
        const searchRes = await axios.get('http://localhost:5003/api/owner/dishes?category=Main', { headers });
        console.log(`Fetched ${searchRes.data.length} Main items`);
        if (searchRes.data.every(i => i.category === 'Main')) {
            console.log('✅ Server-side category filter verified');
        } else {
            console.error('❌ Filter failed');
        }

        console.log('\n--- 3. Test vegType Alias ---');
        const vegRes = await axios.get('http://localhost:5003/api/owner/dishes?vegType=non-veg', { headers });
        console.log(`Fetched ${vegRes.data.length} Non-Veg items using 'vegType' alias`);
        if (vegRes.data.length > 0 && vegRes.data.every(i => i.vegOrNonVeg === 'non-veg')) {
            console.log('✅ Server-side vegType alias verified');
        } else {
            console.error('❌ vegType alias failed');
        }

        console.log('\n--- 4. Test Duplicate Dish Prevention ---');
        // Create a dummy image file
        const dummyImagePath = path.join(__dirname, 'test_image.png');
        if (!fs.existsSync(dummyImagePath)) {
            fs.writeFileSync(dummyImagePath, 'dummy content');
        }

        const formData = new FormData();
        formData.append('foodName', 'Duplicate Test Dish'); // Unique name for this run ideally, but we reuse validation
        formData.append('category', 'Snacks');
        formData.append('vegOrNonVeg', 'veg');
        formData.append('price', '50');
        formData.append('image', fs.createReadStream(dummyImagePath), 'test_image.png');

        const formHeaders = { ...headers, ...formData.getHeaders() };

        // FIRST ATTEMPT (Should Succeed)
        try {
            // First cleanup if exists? No, let's just create one.
            // Actually, if we run this script twice, it will fail the first time too.
            // Let's rely on the error message.
            await axios.post('http://localhost:5003/api/owner/add-custom-dish', formData, { headers: formHeaders });
            console.log('✅ Initial creation successful');
        } catch (e) {
            if (e.response && e.response.status === 400 && e.response.data.msg.includes('already exists')) {
                console.log('ℹ️ Dish already existed from previous run');
            } else {
                throw e;
            }
        }

        // SECOND ATTEMPT (Should Fail)
        try {
            // Need to recreate stream for second request
            const formData2 = new FormData();
            formData2.append('foodName', 'Duplicate Test Dish');
            formData2.append('category', 'Snacks');
            formData2.append('vegOrNonVeg', 'veg');
            formData2.append('price', '50');
            formData2.append('image', fs.createReadStream(dummyImagePath), 'test_image.png');

            const formHeaders2 = { ...headers, ...formData2.getHeaders() };

            await axios.post('http://localhost:5003/api/owner/add-custom-dish', formData2, { headers: formHeaders2 });
            console.error('❌ FAILED: Duplicate creation was allowed!');
        } catch (e) {
            if (e.response && e.response.status === 400 && e.response.data.msg === 'A dish with this name already exists.') {
                console.log('✅ Duplicate prevention verified');
            } else {
                console.error('❌ Unexpected error:', e.response ? e.response.data : e.message);
            }
        }

        console.log('\n--- 5. Test Pagination ---');
        const page1Res = await axios.get('http://localhost:5003/api/owner/dishes?page=1&limit=2', { headers }); // Small limit to ensure test works even with few items
        console.log(`Fetched ${page1Res.data.length} items (Page 1, Limit 2)`);

        if (page1Res.data.length <= 2) {
            console.log('✅ Pagination Limit respected');
        } else {
            console.log('❌ Pagination Limit ignored');
        }

        // Clean up
        if (fs.existsSync(dummyImagePath)) fs.unlinkSync(dummyImagePath);

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
        if (error.response) console.error(error.response.data);
    }
}

testEnhancedOwnerFeatures();
