const axios = require('axios');

const API_base = 'http://127.0.0.1:5003';
const API_URL = `${API_base}/api`;

async function main() {
    try {
        console.log("=== API INTEGRITY FIXER ===");

        // Login
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@mealmatrix.com',
            password: '123456'
        });
        const token = loginRes.headers['x-auth-token'];
        const cookie = loginRes.headers['set-cookie'];
        const headers = {
            'Content-Type': 'application/json',
            'x-auth-token': token,
            'Cookie': cookie
        };

        // Fetch
        const hRes = await axios.get(`${API_URL}/admin/hostels`, { headers });
        const oRes = await axios.get(`${API_URL}/admin/owners`, { headers });
        const hostels = hRes.data;
        const owners = oRes.data;

        let fixCount = 0;

        // Fix Mismatches: Owner -> Hostel but Hostel -> ???
        for (const o of owners) {
            if (o.hostelId && o.hostelId._id) {
                const hostel = hostels.find(h => h._id === o.hostelId._id);
                if (hostel) {
                    const hostelOwnerId = hostel.ownerId ? hostel.ownerId._id : null;
                    if (hostelOwnerId !== o._id) {
                        console.log(`Mismatch: Owner ${o.name} -> Hostel ${hostel.name}, but Hostel -> ${hostel.ownerId ? hostel.ownerId.name : 'NULL'}`);

                        if (!hostelOwnerId) {
                            console.log(`-> Hostel is free. Linking via API...`);
                            await axios.put(`${API_URL}/admin/hostels/${hostel._id}`, { ownerId: o._id }, { headers });
                            fixCount++;
                        } else {
                            console.log(`-> Hostel owned by others. Clearing Owner...`);
                            await axios.put(`${API_URL}/admin/owners/${o._id}`, { hostelId: 'unassigned' }, { headers });
                            fixCount++;
                        }
                    }
                } else {
                    console.log(`Owner ${o.name} references non-existent hostel. Clearing...`);
                    await axios.put(`${API_URL}/admin/owners/${o._id}`, { hostelId: 'unassigned' }, { headers });
                    fixCount++;
                }
            }
        }

        console.log(`Applied ${fixCount} fixes via API.`);

    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) console.error(JSON.stringify(e.response.data));
    }
}

main();
