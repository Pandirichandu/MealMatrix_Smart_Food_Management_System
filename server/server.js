const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

// Validate critical environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('FATAL: Missing required environment variables:', missingVars.join(', '));
    console.error('Please ensure all required variables are set in .env file');
    process.exit(1);
}

const app = express();

// Database Connection with proper error handling
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
        console.error('MongoDB Connection Failed:', err.message);
        process.exit(1);
    });

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            process.env.FRONTEND_URL
        ].filter(Boolean);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(compression());

// Static Image Serving
app.use('/menu-images', express.static(path.join(__dirname, 'public/menu-images')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'))); // Also serve uploads if needed

// Request Logger (Removed for Production)
// app.use((req, res, next) => {
//     // console.log(`[REQUEST] ${req.method} ${req.url}`);
//     next();
// });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/owner', require('./routes/owner'));
app.use('/api/student', require('./routes/student'));
app.use('/api/order', require('./routes/order'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/', (req, res) => {
    res.send('MealMatrix Systems API Running');
});

process.on('uncaughtException', async (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    await gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', async (err) => {
    console.error('UNHANDLED REJECTION:', err);
    await gracefulShutdown('unhandledRejection');
});

// Graceful shutdown helper
async function gracefulShutdown(signal) {
    console.log(`Shutting down due to: ${signal}`);

    // Close database connection
    try {
        await mongoose.connection.close();
        console.log('Database connection closed');
    } catch (err) {
        console.error('Error closing database:', err.message);
    }

    // Close server
    if (server) {
        server.close(() => {
            console.log('Server closed');
            process.exit(1);
        });

        // Force close after 10 seconds
        setTimeout(() => {
            console.error('Forcefully shutting down');
            process.exit(1);
        }, 10000);
    } else {
        process.exit(1);
    }
}

// Handle SIGTERM and SIGINT for graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize Cron Scheduler
const initScheduler = require('./cron/scheduler');
initScheduler();

const PORT = process.env.PORT || 5003;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
