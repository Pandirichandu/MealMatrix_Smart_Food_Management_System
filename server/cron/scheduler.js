const cron = require('node-cron');
const Notification = require('../models/Notification');
const MealBooking = require('../models/MealBooking');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

// Helper to Create Notifications in Batch
const createBatchNotifications = async (recipients, title, message, type, relatedIdSuffix, link = null) => {
    // recipients: array of { userId, hostelId }
    if (!recipients || recipients.length === 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const relatedId = `${todayStr}-${relatedIdSuffix}`;

    // 1. Check existing to avoid duplicates (Idempotency) - Optimization: Check one as proxy or individual?
    // Individual check is safer but slower. Batch insert with ordered:false and unique index on (userId, relatedId) is best.
    // However, Mongo insertMany with duplicates throws error.

    // Strategy: Filter out users who already have this notification
    // This is expensive for thousands of users.
    // Better: Just use `relatedId` and rely on MongoDB unique index or logic.
    // Given the constraints, let's just do a find for existing relatedIds for these users.

    // For now, simpler optimization: 
    // We assume the cron runs ONCE per slot. 
    // We will check if *any* notification exists for this relatedId to prevent full re-run 
    // if the server restarts and cron fires again in same minute (unlikely with node-cron default).

    const notifications = recipients.map(r => ({
        userId: r.userId,
        hostelId: r.hostelId,
        title,
        message,
        type,
        relatedId,
        link,
        createdAt: new Date()
    }));

    try {
        // Use ordered: false to continue inserting even if some fail (unlikely given logic, but safe)
        // But to be completely idempotent without unique index errors polluting logs,
        // we can upsert or check first.

        // Lets checks for one sample. If created, skip.
        const example = await Notification.findOne({ relatedId });
        if (example) {
            console.log(`Skipping batch ${relatedId}, already sent.`);
            return;
        }

        await Notification.insertMany(notifications, { ordered: false });
        console.log(`Sent ${notifications.length} notifications: ${title}`);
    } catch (err) {
        // Ignore duplicate key errors if unique index exists
        if (err.code !== 11000) {
            console.error('Batch Notification Error:', err.message);
        }
    }
};

const checkMenuCompliance = (mealType) => {
    console.log(`[Cron] Checking menu compliance for ${mealType}`);
    // Future: Check if owners have published menus and alert them if not
};

const sendPostMealSummary = (mealType) => {
    console.log(`[Cron] Sending post-meal summary for ${mealType}`);
    // Future: Aggregate attendance and send reports
};

const getEligibleUsers = async (mealType, checkAttendance = false) => {
    const now = new Date();
    // Start of Day UTC
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));

    const query = {
        date: today,
        mealType: mealType
    };

    const selections = await MealBooking.find(query).select('studentId hostelId').lean();
    if (!selections.length) return [];

    let eligible = [];

    if (checkAttendance) {
        // Filter out those who ALREADY attended
        // Find attendance for today & mealType
        const attendanceRecords = await Attendance.find({
            date: today, // Attendance stores date as UTC midnight usually or check schema
            mealType: mealType
        }).select('studentId').lean();

        const attendedIds = new Set(attendanceRecords.map(a => a.studentId.toString()));

        eligible = selections.filter(s => !attendedIds.has(s.studentId.toString()))
            .map(s => ({ userId: s.studentId, hostelId: s.hostelId }));
    } else {
        eligible = selections.map(s => ({ userId: s.studentId, hostelId: s.hostelId }));
    }

    return eligible;
};

// Scheduler Init
const initScheduler = () => {
    console.log('Initializing Notification Scheduler...');

    // ==========================================
    // 1. MEAL START REMINDERS
    // ==========================================

    // Breakfast Start (08:00 AM)
    cron.schedule('0 8 * * *', async () => {
        console.log('Running Breakfast Start Job');
        const users = await getEligibleUsers('breakfast');
        await createBatchNotifications(users, 'Breakfast Started', 'Breakfast is being served now.', 'MEAL_REMINDER', 'BREAKFAST_START', '/student/dashboard');
    });

    // Lunch Start (01:00 PM / 13:00)
    cron.schedule('0 13 * * *', async () => {
        console.log('Running Lunch Start Job');
        const users = await getEligibleUsers('lunch');
        await createBatchNotifications(users, 'Lunch Started', 'Lunch is being served now.', 'MEAL_REMINDER', 'LUNCH_START', '/student/dashboard');
    });

    // Dinner Start (08:00 PM / 20:00)
    cron.schedule('0 20 * * *', async () => {
        console.log('Running Dinner Start Job');
        const users = await getEligibleUsers('dinner');
        await createBatchNotifications(users, 'Dinner Started', 'Dinner is being served now.', 'MEAL_REMINDER', 'DINNER_START', '/student/dashboard');
    });

    // ==========================================
    // 2. LAST 30 MINUTES REMINDER (Closing Soon)
    // ==========================================
    // Breakfast Ends 11:00 -> Alert 10:30
    cron.schedule('30 10 * * *', async () => {
        console.log('Running Breakfast Closing Soon Job');
        const users = await getEligibleUsers('breakfast', true); // Only those who haven't attended
        await createBatchNotifications(users, 'Breakfast Closing Soon', 'Breakfast service ends in 30 minutes.', 'MEAL_REMINDER', 'BREAKFAST_CLOSING', '/student/dashboard');
    });

    // Lunch Ends 16:00 -> Alert 15:30
    cron.schedule('30 15 * * *', async () => {
        console.log('Running Lunch Closing Soon Job');
        const users = await getEligibleUsers('lunch', true);
        await createBatchNotifications(users, 'Lunch Closing Soon', 'Lunch service ends in 30 minutes.', 'MEAL_REMINDER', 'LUNCH_CLOSING', '/student/dashboard');
    });

    // Dinner Ends 23:00 -> Alert 22:30
    cron.schedule('30 22 * * *', async () => {
        console.log('Running Dinner Closing Soon Job');
        const users = await getEligibleUsers('dinner', true);
        await createBatchNotifications(users, 'Dinner Closing Soon', 'Dinner service ends in 30 minutes.', 'MEAL_REMINDER', 'DINNER_CLOSING', '/student/dashboard');
    });

    // ==========================================
    // 3. MISSED MEAL ALERTS
    // ==========================================
    // Breakfast Ends 11:00 -> Alert 11:15
    cron.schedule('15 11 * * *', async () => {
        console.log('Running Breakfast Missed Job');
        const users = await getEligibleUsers('breakfast', true);
        await createBatchNotifications(users, 'Breakfast Missed', 'You missed breakfast today. Please inform if you cannot make it.', 'MISSED_MEAL', 'BREAKFAST_MISSED', '/student/dashboard');
    });

    // Lunch Ends 16:00 -> Alert 16:15
    cron.schedule('15 16 * * *', async () => {
        console.log('Running Lunch Missed Job');
        const users = await getEligibleUsers('lunch', true);
        await createBatchNotifications(users, 'Lunch Missed', 'You missed lunch today.', 'MISSED_MEAL', 'LUNCH_MISSED', '/student/dashboard');
    });

    // Dinner Ends 23:00 -> Alert 23:15
    cron.schedule('15 23 * * *', async () => {
        console.log('Running Dinner Missed Job');
        const users = await getEligibleUsers('dinner', true);
        await createBatchNotifications(users, 'Dinner Missed', 'You missed dinner today.', 'MISSED_MEAL', 'DINNER_MISSED', '/student/dashboard');
    });

    // ==========================================
    // 4. OWNER/ADMIN CHECKS (Menu Compliance)
    // ==========================================
    // Check Breakfast Menu at 7:00 AM (Start 8:00)
    cron.schedule('0 7 * * *', () => checkMenuCompliance('breakfast'));

    // Check Lunch Menu at 11:00 AM (Start 13:00) - Cutoff also 11:00
    cron.schedule('0 11 * * *', () => checkMenuCompliance('lunch'));

    // Check Dinner Menu at 18:00 (Start 20:00)
    cron.schedule('0 18 * * *', () => checkMenuCompliance('dinner'));

    // ==========================================
    // 5. POST-MEAL SUMMARIES
    // ==========================================
    // Breakfast Ends 11:00
    cron.schedule('0 12 * * *', () => sendPostMealSummary('breakfast'));

    // Lunch Ends 16:00
    cron.schedule('0 17 * * *', () => sendPostMealSummary('lunch'));

    // Dinner Ends 23:00
    cron.schedule('59 23 * * *', () => sendPostMealSummary('dinner'));
};

module.exports = initScheduler;
