const mongoose = require('mongoose');
const User = require('../server/models/User');
require('dotenv').config(); // Should find .env in CWD (project root)

async function listOwners() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const owners = await User.find({ role: 'owner' }).limit(5);
        console.log('Owners found:', owners.length);
        owners.forEach(o => {
            console.log(`- Email: ${o.email}, HostelId: ${o.hostelId}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

listOwners();
