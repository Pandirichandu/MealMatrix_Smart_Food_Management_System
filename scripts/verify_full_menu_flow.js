/* eslint-disable */
const axios = require('axios');

async function verifyMenuFlow() {
    try {
        console.log('--- 1. Login as Owner ---');
        const loginRes = await axios.post('http://localhost:5003/api/auth/login', {
            email: 'owner@saveserve.com',
            password: '123456'
        });
        const cookie = loginRes.headers['set-cookie'];
        const ownerHeaders = { Cookie: cookie };
        console.log('✅ Owner Login Successful');

        // Prepare Data
        const date = new Date().toISOString().split('T')[0];
        const mealType = 'lunch';
        const vegItems = [
            { foodName: 'Veg Item 1', imageUrl: 'img1.jpg', category: 'Main', vegOrNonVeg: 'veg', price: 50 },
            { foodName: 'Veg Item 2', imageUrl: 'img2.jpg', category: 'Rice', vegOrNonVeg: 'veg', price: 60 }
        ];
        const nonVegItems = [
            { foodName: 'Chicken Curry', imageUrl: 'chicken.jpg', category: 'Main', vegOrNonVeg: 'non-veg', price: 100 }
        ];

        console.log(`\n--- 2. Save Menu for ${date} (${mealType}) ---`);
        const saveRes = await axios.post('http://localhost:5003/api/owner/save-menu', {
            date,
            mealType,
            vegItems,
            nonVegItems
        }, { headers: ownerHeaders });

        console.log('✅ Menu Saved:', saveRes.data.mealType);

        // --- Student Check ---
        console.log('\n--- 3. Login as Student ---');
        const stdLoginRes = await axios.post('http://localhost:5003/api/auth/login', {
            email: 'student@saveserve.com',
            password: '123456'
        });
        const stdCookie = stdLoginRes.headers['set-cookie'];
        const stdHeaders = { Cookie: stdCookie };
        console.log('✅ Student Login Successful');

        console.log('\n--- 4. Fetch Today Menu (Student) ---');
        const todayRes = await axios.get(`http://localhost:5003/api/student/today-menu?date=${date}`, { headers: stdHeaders });

        const lunch = todayRes.data.lunch;
        console.log(`Fetched Lunch Items: ${lunch ? lunch.length : 0}`);

        if (lunch && lunch.length === 3) {
            console.log('✅ Correct number of items fetched');
            const vegCount = lunch.filter(i => i.vegOrNonVeg === 'veg').length;
            const nonVegCount = lunch.filter(i => i.vegOrNonVeg === 'non-veg').length;
            console.log(`Veg: ${vegCount} (Expected 2), Non-Veg: ${nonVegCount} (Expected 1)`);

            if (vegCount === 2 && nonVegCount === 1) {
                console.log('✅ Veg/Non-Veg aggregation correct');
            } else {
                console.error('❌ Aggregation mismatch');
            }
        } else {
            console.error('❌ Failed to fetch correct items');
            console.log('Received:', JSON.stringify(todayRes.data, null, 2));
        }

    } catch (err) {
        console.error('❌ Test Failed:', err.message);
        if (err.response) console.error(err.response.data);
    }
}

verifyMenuFlow();
