require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

console.log('Attempting to connect...');
console.log('URI length:', process.env.MONGO_URI ? process.env.MONGO_URI.length : 'undefined');

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected!');
        mongoose.connection.close();
    })
    .catch(err => {
        console.error('Connection Error:', err);
    });
