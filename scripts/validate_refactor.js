const mongoose = require('mongoose');
const User = require('../server/models/User');
const FoodItem = require('../server/models/FoodItem');
const Menu = require('../server/models/Menu');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const API_BASE = 'http://localhost:5003/api';
let token = '';
let ownerUser = null;

async function generateToken() {
    await mongoose.connect(process.env.MONGODB_URI.replace('localhost', '127.0.0.1'));
    ownerUser = await User.findOne({ role: 'owner' });
    if (!ownerUser) {
        console.error("No owner found in DB");
        process.exit(1);
    }

    // Generate valid JWT
    const payload = { user: { id: ownerUser.id, role: ownerUser.role } };
    token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log(`[AUTH] Successfully generated token for ${ownerUser.email}`);
}

async function runTests() {
    await generateToken();
    const headers = { 'x-auth-token': token };

    let myDish = await FoodItem.findOne({ ownerId: ownerUser._id });
    if (!myDish) {
        myDish = await FoodItem.create({
            foodName: 'Test Dish Alpha',
            normalizedName: 'test-dish-alpha',
            category: 'Main Course',
            vegOrNonVeg: 'veg',
            price: 150,
            isCustomDish: true,
            ownerId: ownerUser._id,
            imageUrl: '/menu-images/placeholder.jpg'
        });
    }

    console.log("\n--------------------------------------------------");
    console.log("1. OWNER DISH EDIT TEST");
    console.log("--------------------------------------------------");
    try {
        const initialCount = await FoodItem.countDocuments({ ownerId: ownerUser._id });

        // API Call to edit dish
        const newName = 'Test Dish Alpha ' + Date.now();
        const res = await axios.put(`${API_BASE}/owner/dishes/${myDish._id}`, {
            foodName: newName
        }, { headers });

        const updatedDish = await FoodItem.findById(myDish._id);
        const finalCount = await FoodItem.countDocuments({ ownerId: ownerUser._id });

        if (res.status === 200 && updatedDish.foodName === newName && initialCount === finalCount) {
            console.log("STATUS: PASS");
            console.log("DETAILS: Updated name persists in DB via API. No duplicate entries created.");
        } else {
            console.log("STATUS: FAIL");
            console.log("DETAILS: Dish name didn't update or duplicates created");
        }
    } catch (e) {
        console.log("STATUS: FAIL");
        console.log("DETAILS:", e.response ? e.response.data : e.message);
    }

    console.log("\n--------------------------------------------------");
    console.log("2. IMAGE REPLACEMENT TEST");
    console.log("--------------------------------------------------");
    try {
        const imgPath = path.join(__dirname, 'dummy.jpg');
        fs.writeFileSync(imgPath, 'fake image data');

        const form = new FormData();
        form.append('image', fs.createReadStream(imgPath));
        form.append('foodName', 'Test Dish Alpha Updated Data');

        const beforeImg = myDish.imageUrl;

        const res = await axios.put(`${API_BASE}/owner/dishes/${myDish._id}`, form, {
            headers: { ...headers, ...form.getHeaders() }
        });

        fs.unlinkSync(imgPath);
        const updatedDish = await FoodItem.findById(myDish._id);

        if (res.status === 200 && updatedDish.imageUrl !== beforeImg && updatedDish.imageUrl.includes('/menu-images/custom/')) {
            console.log("STATUS: PASS");
            console.log("DETAILS: New image URL assigned successfully. Old image cache bypassed. New URL: " + updatedDish.imageUrl);
        } else {
            console.log("STATUS: FAIL");
            console.log("DETAILS: Image was not processed successfully");
        }
    } catch (e) {
        console.log("STATUS: FAIL");
        console.log("DETAILS:", e.response ? e.response.data : e.message);
    }

    console.log("\n--------------------------------------------------");
    console.log("3. DELETE TEST");
    console.log("--------------------------------------------------");
    try {
        const res = await axios.delete(`${API_BASE}/owner/dishes/${myDish._id}`, { headers });
        const checkDish = await FoodItem.findById(myDish._id);

        if (res.status === 200 && !checkDish) {
            console.log("STATUS: PASS");
            console.log("DETAILS: Dish disappears immediately. No 500 server crash. API Response: " + res.data.msg);
        } else {
            console.log("STATUS: FAIL");
            console.log("DETAILS: Dish still present or API failed");
        }
    } catch (e) {
        console.log("STATUS: FAIL");
        console.log("DETAILS:", e.response ? e.response.data : e.message);
    }

    console.log("\n--------------------------------------------------");
    console.log("5. HISTORICAL MENU SAFETY TEST");
    console.log("--------------------------------------------------");
    try {
        const fakeMenu = new Menu({
            hostelId: ownerUser.hostelId,
            date: new Date('2020-01-01'),
            mealType: 'lunch',
            status: 'PUBLISHED',
            vegItems: [{ itemName: 'Test Historical Item', quantity: 50, dishId: new mongoose.Types.ObjectId() }]
        });
        await fakeMenu.save();

        const res = await axios.get(`${API_BASE}/owner/menu?date=2020-01-01&mealType=lunch`, { headers });
        await Menu.findByIdAndDelete(fakeMenu._id);

        if (res.status === 200 && res.data.vegItems[0].itemName === 'Test Historical Item') {
            console.log("STATUS: PASS");
            console.log("DETAILS: Historical menu renders correctly with valid JSON response even if original dishes are deleted. (Items are embedded).");
        } else {
            console.log("STATUS: FAIL");
            console.log("DETAILS: Menu failed to fetch");
        }
    } catch (e) {
        console.log("STATUS: FAIL");
        console.log("DETAILS:", e.response ? e.response.data : e.message);
        await Menu.deleteOne({ date: new Date('2020-01-01') });
    }

    console.log("\n--------------------------------------------------");
    console.log("6. SECURITY TEST");
    console.log("--------------------------------------------------");
    try {
        const globalDish = await FoodItem.findOne({ ownerId: null });
        if (!globalDish) {
            console.log("STATUS: FAIL\nDETAILS: Cannot run security test, no global dish found");
        } else {
            const res = await axios.put(`${API_BASE}/owner/dishes/${globalDish._id}`, {
                foodName: "Hacked Global Dish"
            }, { headers }).catch(e => e.response);

            if (res.status === 403) {
                console.log("STATUS: PASS");
                console.log("DETAILS: Backend correctly blocks request preventing unauthorized mutation. Code 403. Response: " + res.data.msg);
            } else {
                console.log("STATUS: FAIL");
                console.log(`DETAILS: Expected 403 but got ${res.status}`);
            }
        }
    } catch (e) {
        console.log("STATUS: FAIL");
        console.log("DETAILS: Unexpected error " + e.message);
    }

    await mongoose.disconnect();
    process.exit(0);
}

runTests();
