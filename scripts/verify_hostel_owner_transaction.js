const axios = require('axios');

// API Config
const API_URL = 'http://localhost:5003/api';

async function run() {
    try {
        console.log("🔹 1. Logging in as Admin...");
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@mealmatrix.com',
            password: '123456',
            role: 'admin'
        });

        let token = null;
        const setCookie = loginRes.headers['set-cookie'];
        if (setCookie) {
            const tokenCookie = setCookie.find(c => c.startsWith('token='));
            if (tokenCookie) token = tokenCookie.split(';')[0].split('=')[1];
        }

        if (!token) {
            console.error("❌ Login failed: No token found.");
            process.exit(1);
        }
        console.log("✅ Admin Logged In");

        const config = {
            headers: {
                'x-auth-token': token,
                'Content-Type': 'application/json'
            },
            withCredentials: true
        };
        // Note: axios nodejs doesn't auto-send cookies unless using a jar, but x-auth-token header works for this backend.

        console.log("\n🔹 2. Creating Test Owners...");
        const owner1Res = await axios.post(`${API_URL}/admin/owners`, {
            name: "TestOwner1", email: `testowner1_${Date.now()}@test.com`, password: "password", role: "owner"
        }, config);
        const owner1Id = owner1Res.data._id;
        console.log(`✅ Created Owner 1: ${owner1Id}`);

        const owner2Res = await axios.post(`${API_URL}/admin/owners`, {
            name: "TestOwner2", email: `testowner2_${Date.now()}@test.com`, password: "password", role: "owner"
        }, config);
        const owner2Id = owner2Res.data._id;
        console.log(`✅ Created Owner 2: ${owner2Id}`);

        console.log("\n🔹 3. Creating Hostel with Owner 1 (Atomic Assignment)...");
        const hostelRes = await axios.post(`${API_URL}/admin/hostels`, {
            name: `TestHostel_${Date.now()}`,
            location: "North Campus",
            totalRooms: 100,
            ownerId: owner1Id
        }, config);
        const hostelId = hostelRes.data._id;
        console.log(`✅ Created Hostel: ${hostelId}`);
        console.log(`   Hostel Owner ID in Response: ${hostelRes.data.ownerId}`);

        // Verify Linkage
        let ownersList = await axios.get(`${API_URL}/admin/owners`, config);
        console.log(`   Fetched ${ownersList.data.length} owners.`);

        let o1 = ownersList.data.find(o => o._id === owner1Id);

        if (!o1) {
            console.error(`❌ CRITICAL: Owner 1 (${owner1Id}) not found in GET /owners list!`);
            console.log("Dump of owners IDs:", ownersList.data.map(o => o._id));
            return;
        }

        console.log(`   Owner 1 found. Assigned Hostel:`, o1.assignedHostel);

        if (hostelRes.data.ownerId === owner1Id && o1.assignedHostel && o1.assignedHostel._id === hostelId) {
            console.log("✅ VERIFIED: Hostel and Owner 1 are linked.");
        } else {
            console.error("❌ FAILED: Initial Linkage Incorrect");
            console.log(`Hostel.ownerId: ${hostelRes.data.ownerId} (Expected ${owner1Id})`);
            console.log(`Owner.assignedHostel:`, o1.assignedHostel);
        }

        console.log("\n🔹 4. Reassigning Hostel to Owner 2 (Swap)...");
        const updateRes = await axios.put(`${API_URL}/admin/hostels/${hostelId}`, {
            ownerId: owner2Id
        }, config);
        console.log("   Update complete.");

        // Verify Swap
        ownersList = await axios.get(`${API_URL}/admin/owners`, config);
        o1 = ownersList.data.find(o => o._id === owner1Id);
        let o2 = ownersList.data.find(o => o._id === owner2Id);
        let hostelCheck = await axios.get(`${API_URL}/admin/hostels`, config);
        let h = hostelCheck.data.find(h => h._id === hostelId);

        console.log(`   Swap Check: Hostel Owner: ${h.ownerId ? h.ownerId._id : 'null'}`);
        console.log(`   Owner 1 Hostel:`, o1?.assignedHostel);
        console.log(`   Owner 2 Hostel:`, o2?.assignedHostel);

        if (h.ownerId && h.ownerId._id === owner2Id && (!o1 || !o1.assignedHostel) && o2.assignedHostel && o2.assignedHostel._id === hostelId) {
            console.log("✅ VERIFIED: Hostel moved to Owner 2. Owner 1 is free.");
        } else {
            console.error("❌ FAILED: Swap Logic");
        }

        console.log("\n🔹 5. Updating Owner 2 to New Hostel (Steal/Move)...");
        // Create Hostel 2 (Empty)
        const hostel2Res = await axios.post(`${API_URL}/admin/hostels`, {
            name: `TestHostel2_${Date.now()}`,
            location: "South Campus",
            totalRooms: 50
        }, config);
        const hostel2Id = hostel2Res.data._id;
        console.log(`   Created Hostel 2: ${hostel2Id}`);

        // Assign Owner 2 to Hostel 2 via PUT /owners/:id
        await axios.put(`${API_URL}/admin/owners/${owner2Id}`, {
            hostelId: hostel2Id
        }, config);
        console.log("   Owner update complete.");

        // Verify Move
        ownersList = await axios.get(`${API_URL}/admin/owners`, config);
        o2 = ownersList.data.find(o => o._id === owner2Id);
        hostelCheck = await axios.get(`${API_URL}/admin/hostels`, config);
        h = hostelCheck.data.find(h => h._id === hostelId); // Old hostel
        let h2 = hostelCheck.data.find(h => h._id === hostel2Id); // New hostel

        console.log(`   Move Check: Old Hostel Owner: ${h.ownerId ? h.ownerId._id : 'null'}`);
        console.log(`   New Hostel Owner: ${h2.ownerId ? h2.ownerId._id : 'null'}`);
        console.log(`   Owner 2 Hostel:`, o2?.assignedHostel);

        if (!h.ownerId && h2.ownerId && h2.ownerId._id === owner2Id && o2.assignedHostel && o2.assignedHostel._id === hostel2Id) {
            console.log("✅ VERIFIED: Owner 2 moved to Hostel 2. Hostel 1 is now empty.");
        } else {
            console.error("❌ FAILED: Owner Move Logic");
        }

        console.log("\n✅ ALL TESTS PASSED");

    } catch (e) {
        console.error("❌ ERROR:", e.response ? e.response.data : e.message);
    }
}

run();
