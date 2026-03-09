const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://0.0.0.0:27017/saveserve')
    .then(async () => {
        console.log('Connected. Resetting owner password...');
        try {
            const salt = await bcrypt.genSalt(10);
            const password = await bcrypt.hash('123456', salt);

            const res = await User.updateOne(
                { email: 'owner@saveserve.com' },
                { $set: { password: password } }
            );
            console.log('Update Result:', res);
            process.exit(0);
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    });
