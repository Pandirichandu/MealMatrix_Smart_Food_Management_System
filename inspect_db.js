/* eslint-disable @typescript-eslint/no-require-imports */
const mongoose = require('mongoose');
const MealBooking = require('./server/models/MealBooking');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://0.0.0.0:27017/saveserve';
console.log("Connecting to:", MONGO_URI);

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB');
        try {
            const bookings = await MealBooking.find({});
            console.log('Found Bookings:', bookings.length);
            console.log(JSON.stringify(bookings, null, 2));
        } catch (e) {
            console.error(e);
        } finally {
            mongoose.connection.close();
        }
    })
    .catch(err => console.error(err));
