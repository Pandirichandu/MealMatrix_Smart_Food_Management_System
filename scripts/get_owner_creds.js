const mongoose = require('mongoose');
const User = require('../server/models/User');
require('dotenv').config();

async function getOwner() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false });
        console.log('Connected');

        const owner = await User.findOne({ role: 'owner' });
        if (owner) {
            console.log(`OWNER_EMAIL: ${owner.email}`);
        } else {
            console.log('NO_OWNER_FOUND');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

getOwner();
