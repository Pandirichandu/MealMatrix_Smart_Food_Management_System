const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://127.0.0.1:5003/api';
const LOG_FILE = path.join(__dirname, '../api_audit.log');

// Clear log
try { fs.writeFileSync(LOG_FILE, ''); } catch (e) { }

const LOG = {
    info: (msg) => { console.log(`[INFO] ${msg}`); fs.appendFileSync(LOG_FILE, `[INFO] ${msg}\n`); },
    error: (msg) => { console.error(`[ERROR] ${msg}`); fs.appendFileSync(LOG_FILE, `[ERROR] ${msg}\n`); },
    success: (msg) => { console.log(`[SUCCESS] ${msg}`); fs.appendFileSync(LOG_FILE, `[SUCCESS] ${msg}\n`); }
};

async function runApiAudit() {
    try {
        LOG.info("Starting API-Only Consistency Audit...");

        // 1. Login
        LOG.info("Logging in...");
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
        LOG.success("Login Successful.");

        // 2. Fetch Data
        LOG.info("Fetching Hostels...");
        const hostelsRes = await axios.get(`${API_URL}/admin/hostels`, { headers });
        const hostels = hostelsRes.data;
        LOG.info(`Fetched ${hostels.length} Hostels.`);

        LOG.info("Fetching Owners...");
        const ownersRes = await axios.get(`${API_URL}/admin/owners`, { headers });
        const owners = ownersRes.data;
        LOG.info(`Fetched ${owners.length} Owners.`);

        let inconsistencies = 0;

        // 3. Verify Population
        // Hostels should have ownerId populated as object with name
        const unpopulatedHostels = hostels.filter(h => h.ownerId && (!h.ownerId._id || !h.ownerId.name));
        if (unpopulatedHostels.length > 0) {
            LOG.error(`Found ${unpopulatedHostels.length} hostels with malformed/unpopulated ownerId.`);
            inconsistencies++;
        } else {
            LOG.success("All assigned hostels have populated owner details.");
        }

        // Owners should have hostelId populated as object with name
        const unpopulatedOwners = owners.filter(o => o.hostelId && (!o.hostelId._id || !o.hostelId.name));
        if (unpopulatedOwners.length > 0) {
            LOG.error(`Found ${unpopulatedOwners.length} owners with malformed/unpopulated hostelId.`);
            inconsistencies++;
        } else {
            LOG.success("All assigned owners have populated hostel details.");
        }

        // 4. Verify 1-to-1 Mapping (Cross-Reference)
        LOG.info("Verifying 1-to-1 Integrity...");

        // Check if Hostel points to Owner, does Owner point back?
        hostels.forEach(h => {
            if (h.ownerId) {
                const ownerId = h.ownerId._id;
                const owner = owners.find(o => o._id === ownerId);

                if (!owner) {
                    LOG.error(`Hostel ${h.name} assigned to OwnerID ${ownerId} which is not found in Owners list.`);
                    inconsistencies++;
                } else {
                    // Check if owner points back
                    if (!owner.hostelId || owner.hostelId._id !== h._id) {
                        LOG.error(`Integrity Error: Hostel '${h.name}' -> Owner '${owner.name}', BUT Owner '${owner.name}' -> Hostel '${owner.hostelId?.name || "None"}'`);
                        inconsistencies++;
                    }
                }
            }
        });

        // Check if Owner points to Hostel, does Hostel point back?
        owners.forEach(o => {
            if (o.hostelId) {
                const hostelId = o.hostelId._id;
                const hostel = hostels.find(h => h._id === hostelId);

                if (!hostel) {
                    LOG.error(`Owner ${o.name} assigned to HostelID ${hostelId} which is not found in Hostels list.`);
                    inconsistencies++;
                } else {
                    // Check if hostel points back
                    if (!hostel.ownerId || hostel.ownerId._id !== o._id) {
                        LOG.error(`Integrity Error: Owner '${o.name}' -> Hostel '${hostel.name}', BUT Hostel '${hostel.name}' -> Owner '${hostel.ownerId?.name || "None"}'`);
                        inconsistencies++;
                    }
                }
            }
        });

        if (inconsistencies === 0) {
            LOG.success("System Logic Verified: OK. 1-to-1 Mapping is Consistent.");
            process.exit(0);
        } else {
            LOG.error(`Audit Failed with ${inconsistencies} inconsistencies.`);
            process.exit(1);
        }

    } catch (err) {
        LOG.error(`API Check Failed: ${err.message}`);
        if (err.response) {
            LOG.error(`Data: ${JSON.stringify(err.response.data)}`);
        }
        process.exit(1);
    }
}

runApiAudit();
