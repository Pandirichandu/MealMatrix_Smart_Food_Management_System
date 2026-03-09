const express = require('express');
const router = express.Router();

const MealBooking = require('../models/MealBooking'); // Added
const MealIntention = require('../models/MealIntention'); // Added
const Menu = require('../models/Menu');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const Settings = require('../models/Settings');
const User = require('../models/User');
const { auth, checkRole } = require('../middleware/auth');
const ensureActiveStudent = require('../middleware/ensureActiveStudent');
const { getCutoffTime } = require('../utils/cutoffTimer');
const jwt = require('jsonwebtoken');
// @route   GET api/student/menu
// @desc    Get weekly menu
// @access  Private (Student)
// @route   GET api/student/menu
// @desc    Get weekly menu (Aggregated by Date)
// @access  Private (Student)
// @route   GET api/student/menu
// @desc    Get weekly menu (Aggregated by Date)
// @access  Private (Student)
router.get('/menu', auth, checkRole(['student']), async (req, res) => {
    try {
        const menus = await Menu.find({ hostelId: req.user.hostelId }).sort({ date: 1 }).lean();

        // Aggregate by Date
        const aggregated = {}; // Key: "YYYY-MM-DD", Value: { date, breakfast: [], lunch: [], dinner: [] }

        menus.forEach(doc => {
            // DATE NORMALIZATION (CRITICAL)
            // Stored as UTC Midnight. Convert to string YYYY-MM-DD exactly as is.
            // Explicitly use UTC methods to avoid local timezone shifts (e.g., prev day).
            const d = new Date(doc.date);
            const year = d.getUTCFullYear();
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            if (!aggregated[dateStr]) {
                aggregated[dateStr] = {
                    date: dateStr,
                    breakfast: [],
                    lunch: [],
                    dinner: []
                };
            }

            const menuType = doc.mealType.toLowerCase();
            const validTypes = ['breakfast', 'lunch', 'dinner'];

            if (validTypes.includes(menuType)) {
                // Combine veg and non-veg
                const allItems = [...(doc.vegItems || []), ...(doc.nonVegItems || [])];

                // STRICT FILTERING: Only items that match this mealType
                const filteredItems = allItems.filter(item => {
                    if (item.mealType) {
                        return item.mealType.toLowerCase() === menuType;
                    }
                    return true;
                });

                // ASSIGN TO BUCKET (Overwriting the specific bucket only, merging if multiple docs - though restricted by schema)
                // If multiple docs existed, we would concat. With unique schema, assignment is safe.
                aggregated[dateStr][menuType] = filteredItems;
                aggregated[dateStr][`${menuType}Status`] = doc.status || 'PUBLISHED';
            }
        });

        const responseList = Object.values(aggregated).sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json(responseList);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/student/today-menu
// @desc    Get menu for a specific date with optional filtering
// @access  Private (Student)
router.get('/today-menu', auth, checkRole(['student']), async (req, res) => {
    try {
        const { date, vegOrNonVeg } = req.query;

        // Construct Date Range for the query to be robust against Timezones
        // Define Start and End of this Day in UTC (to match DB storage)
        // Parse "YYYY-MM-DD" strictly as UTC
        // Parse "YYYY-MM-DD" strictly as UTC
        // Ensure 'date' query param exists or fallback safely
        const rawDate = date || new Date().toISOString().split('T')[0];
        const parts = rawDate.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);

        const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

        // Fetch all menu documents (B, L, D) for this date range
        const menus = await Menu.find({
            hostelId: req.user.hostelId,
            date: { $gte: startOfDay, $lte: endOfDay }
        }).lean();

        // Aggregate into single response object
        const response = {
            breakfast: [],
            lunch: [],
            dinner: []
        };

        if (menus && menus.length > 0) {
            menus.forEach(menu => {
                const docMealType = menu.mealType.toLowerCase();

                // Safety: Ensure we only process known types
                if (response[docMealType]) {
                    // Combine all items from this menu doc
                    // (Schema enforces 1 doc per type, but if duplicates exist, we take the latest by overwriting or merging.
                    //  Given strictly isolated docs, overwriting the bucket with this doc's items is correct for that specific meal type)

                    const items = [...(menu.vegItems || []), ...(menu.nonVegItems || [])];
                    const processedItems = items.map((item, index) => ({
                        ...item,
                        // Ensure each item has the correct mealType tagged for UI filtering
                        mealType: docMealType,
                        // Fallback ID for legacy items without _id
                        _id: item._id || `${menu._id}-${docMealType}-${index}`
                    }));

                    response[docMealType] = processedItems;
                    response[`${docMealType}MaxDishes`] = menu.maxDishesPerStudent; // Send limit to frontend
                }
            });
        }

        // Optimistic: If we found nothing, we just return empty arrays.
        // Frontend will handle "Menu not available".

        // Backend Filtering (optional optimization)
        if (vegOrNonVeg) {
            ['breakfast', 'lunch', 'dinner'].forEach(meal => {
                if (response[meal]) {
                    response[meal] = response[meal].filter(item => item.vegOrNonVeg === vegOrNonVeg);
                }
            });
        }

        res.json(response);
    } catch (err) {
        console.error('Today Menu Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/student/meal-status
// @desc    Get dynamic status of meals (ACTIVE, SCANNED, COMPLETED) for a given date
// @access  Private (Student)
router.get('/meal-status', auth, checkRole(['student']), async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ msg: 'Date is required' });

        // Normalize Date
        const parts = date.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

        const Attendance = require('../models/Attendance');
        const bookings = await MealBooking.find({
            studentId: req.user.id,
            date: { $gte: startOfDay, $lte: endOfDay }
        }).lean();

        const attendances = await Attendance.find({
            studentId: req.user.id,
            date: { $gte: startOfDay, $lte: endOfDay }
        }).lean();

        const currentTime = new Date();
        const todayUtc = new Date(Date.UTC(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), 0, 0, 0, 0));
        const currentHour = currentTime.getHours();
        const currentMinute = currentTime.getMinutes();
        const currentTimeInMinutes = currentHour * 60 + currentMinute;

        const mealTypes = ['breakfast', 'lunch', 'dinner'];
        const responseData = {};

        // Calculate Day Diff
        const dayDiff = Math.floor((startOfDay.getTime() - todayUtc.getTime()) / (1000 * 60 * 60 * 24));

        for (const type of mealTypes) {
            const isBooked = bookings.some(b => b.mealType === type);
            const isScanned = attendances.some(a => a.mealType === type);

            let bookingState = 'CLOSED';
            let cutoffTimeObj = new Date(startOfDay.getTime()); // Representing the end of the current window

            if (dayDiff > 0) {
                // Tomorrow
                bookingState = 'OPEN';
                cutoffTimeObj = new Date();
                cutoffTimeObj.setHours(23, 59, 59, 999);
            } else if (dayDiff === 0) {
                // Today
                bookingState = 'OPEN';
                if (type === 'breakfast') {
                    cutoffTimeObj.setHours(5, 0, 0, 0);
                    if (currentTimeInMinutes >= 5 * 60) bookingState = 'CLOSED';
                } else if (type === 'lunch') {
                    cutoffTimeObj.setHours(9, 30, 0, 0);
                    if (currentTimeInMinutes >= 9 * 60 + 30) bookingState = 'CLOSED';
                } else if (type === 'dinner') {
                    cutoffTimeObj.setHours(14, 30, 0, 0);
                    if (currentTimeInMinutes >= 14 * 60 + 30) bookingState = 'CLOSED';
                }
            }

            let state = bookingState;

            if (isScanned) {
                state = 'SCANNED';
            } else if (dayDiff < 0) {
                state = 'COMPLETED';
            } else if (dayDiff === 0 && bookingState === 'CLOSED') {
                state = 'COMPLETED';
            }

            responseData[type] = {
                mealType: type,
                state: state, // Overall display state (SCANNED, COMPLETED, OPEN, LIMITED, CLOSED)
                bookingState: bookingState, // The strict booking availability state
                isBooked: isBooked,
                isScanned: isScanned,
                endTime: cutoffTimeObj.toISOString()
            };
        }

        res.json({ date, statuses: responseData });

    } catch (err) {
        console.error('Meal Status Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/student/booking
// @desc    Get existing booking for a specific date and mealType
// @access  Private (Student)
router.get('/booking', auth, checkRole(['student']), async (req, res) => {
    try {
        const { date, mealType } = req.query;

        if (!date || !mealType) {
            return res.status(400).json({ msg: 'Date and MealType required' });
        }

        // Normalize Date (UTC Midnight)
        const parts = date.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        const dateObj = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

        const booking = await MealBooking.findOne({
            studentId: req.user.id,
            date: dateObj,
            mealType: mealType.toLowerCase()
        });

        if (!booking) {
            return res.json({ booked: false });
        }

        res.json({ booked: true, booking });

    } catch (err) {
        console.error('Fetch Booking Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/student/meal-intention
// @desc    Get meal intention for a specific date
// @access  Private (Student)
router.get('/meal-intention', auth, checkRole(['student']), async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ msg: 'Date required' });
        }

        const parts = date.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        const dateObj = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

        const intentions = await MealIntention.find({
            studentId: req.user.id,
            hostelId: req.user.hostelId,
            date: dateObj
        }).lean();

        // Convert array to object { breakfast: 'present', lunch: 'not_coming', dinner: null }
        const result = { breakfast: null, lunch: null, dinner: null };
        intentions.forEach(i => {
            if (result[i.mealType] !== undefined) {
                result[i.mealType] = i.status;
            }
        });

        res.json(result);
    } catch (err) {
        console.error('Fetch Meal Intention Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/student/meal-intention
// @desc    Upsert meal intention
// @access  Private (Student)
router.post('/meal-intention', auth, checkRole(['student']), ensureActiveStudent, async (req, res) => {
    try {
        const { date, mealType, status } = req.body;

        if (!date || !mealType || !status) {
            return res.status(400).json({ msg: 'Missing required fields' });
        }

        if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
            return res.status(400).json({ msg: 'Invalid mealType' });
        }

        if (!['present', 'not_coming'].includes(status)) {
            return res.status(400).json({ msg: 'Invalid status' });
        }

        const parts = date.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        const dateObj = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

        const intention = await MealIntention.findOneAndUpdate(
            {
                studentId: req.user.id,
                date: dateObj,
                mealType: mealType
            },
            {
                $set: {
                    hostelId: req.user.hostelId,
                    status: status
                }
            },
            { new: true, upsert: true }
        );

        // If status is not_coming, ensure any existing booking is deleted
        if (status === 'not_coming') {
            await MealBooking.deleteOne({
                studentId: req.user.id,
                date: dateObj,
                mealType: mealType
            });
        }

        res.json({ success: true, message: 'Meal intention updated successfully', data: intention });
    } catch (err) {
        console.error('Update Meal Intention Error:', err.message);
        res.status(500).send('Server Error');
    }
});

router.post('/select', auth, checkRole(['student']), ensureActiveStudent, async (req, res) => {
    let { date, mealType, items, action } = req.body;

    if (!date || !mealType) {
        return res.status(400).json({ msg: 'Missing required fields: date, mealType' });
    }

    try {
        const normalizedMealType = mealType.toLowerCase();

        // 1. TIME VALIDATION & Strict State Checking
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeInMinutes = currentHour * 60 + currentMinute;

        const parts = date.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        const dateObj = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const localTargetDate = new Date(year, month, day);
        const localTodayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const dayDiff = Math.floor((localTargetDate - localTodayMidnight) / (1000 * 60 * 60 * 24));

        let state = 'CLOSED';
        let bookingType = 'closed';

        if (dayDiff > 0) {
            state = 'OPEN';
            bookingType = 'advance';
        } else if (dayDiff === 0) {
            state = 'OPEN';
            bookingType = 'advance';
            if (normalizedMealType === 'breakfast') {
                if (currentTimeInMinutes >= 5 * 60) { state = 'CLOSED'; bookingType = 'closed'; }
            } else if (normalizedMealType === 'lunch') {
                if (currentTimeInMinutes >= 9 * 60 + 30) { state = 'CLOSED'; bookingType = 'closed'; }
            } else if (normalizedMealType === 'dinner') {
                if (currentTimeInMinutes >= 14 * 60 + 30) { state = 'CLOSED'; bookingType = 'closed'; }
            }
        }

        if (state === 'CLOSED') {
            return res.status(400).json({ msg: 'Booking closed for this meal.' });
        }

        const intention = await MealIntention.findOne({
            studentId: req.user.id,
            date: dateObj,
            mealType: normalizedMealType
        });

        if (!intention) {
            return res.status(400).json({ msg: 'Please select Present or Skip before booking.' });
        }

        if (intention.status === 'not_coming') {
            return res.status(400).json({ msg: 'Cannot book meal when marked as Skip.' });
        }

        let validItems = [];

        if (state === 'OPEN') {
            if (!items || items.length === 0) {
                // Auto-assign Common Meal
                validItems = [{
                    itemName: 'Common Meal',
                    quantity: 1,
                    dishId: 'common-meal-late' // using a generic ID
                }];
                bookingType = 'late';
            } else {
                // Validate items against menu for advance bookings
                const menu = await Menu.findOne({
                    hostelId: req.user.hostelId,
                    date: dateObj,
                    mealType: normalizedMealType
                });

                if (!menu) {
                    return res.status(400).json({ msg: 'Menu not available for this date' });
                }

                const menuItems = [...(menu.vegItems || []), ...(menu.nonVegItems || [])];

                for (const item of items) {
                    const menuDish = menuItems.find(d =>
                        (item._id && d._id && d._id.toString() === item._id) ||
                        d.foodName === item.itemName
                    );

                    if (!menuDish) return res.status(400).json({ msg: `Item not found in menu: ${item.itemName}` });

                    const qty = parseInt(item.quantity);
                    if (qty <= 0) continue;

                    const limit = menuDish.maxQuantity || 1;
                    if (qty > limit) return res.status(400).json({ msg: `Max quantity for ${item.itemName} is ${limit}` });

                    validItems.push({
                        itemName: menuDish.foodName,
                        quantity: qty,
                        dishId: menuDish._id
                    });
                }

                if (validItems.length === 0) {
                    return res.status(400).json({ msg: 'No valid items to book.' });
                }
            }
        }

        // 4. SAVE BOOKING (Upsert)
        const booking = await MealBooking.findOneAndUpdate(
            {
                studentId: req.user.id,
                date: dateObj,
                mealType: normalizedMealType
            },
            {
                $set: {
                    hostelId: req.user.hostelId,
                    items: validItems,
                    bookingType: bookingType,
                    updatedAt: new Date()
                }
            },
            { new: true, upsert: true }
        );

        // 5. NOTIFICATION TRIGGER
        await Notification.create({
            userId: req.user.id,
            hostelId: req.user.hostelId,
            title: 'Booking Confirmed',
            message: `Your ${normalizedMealType} booking for ${date} has been confirmed (${state} state).`,
            type: 'ATTENDANCE_CONFIRMED',
            link: '/student/dashboard'
        });

        res.json({ msg: 'Booking successful', booking });

    } catch (err) {
        console.error('Booking Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/student/qr
// @desc    Get QR Data for today's meal
// @access  Private (Student)
router.get('/qr', auth, checkRole(['student']), ensureActiveStudent, async (req, res) => {
    try {
        // Generate QR data for the immediate next meal
        // Use UTC Date String to match everywhere else
        const today = new Date().toISOString().split('T')[0];

        const currentHour = new Date().getHours();
        let mealType = 'lunch';
        if (currentHour < 10) mealType = 'breakfast';
        else if (currentHour >= 15) mealType = 'dinner';

        // Fetch user to get custom studentId
        const user = await User.findById(req.user.id);
        if (!user || !user.studentId) {
            return res.status(400).json({ msg: 'Student ID not assigned. Contact Admin.' });
        }

        const payload = {
            studentId: user.studentId,
            date: today,
            mealType: mealType
        };

        const qrData = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
        res.json({ qrData });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

const Feedback = require('../models/Feedback');

// @route   POST api/student/feedback
// @desc    Submit feedback
// @access  Private (Student)
router.post('/feedback', auth, checkRole(['student']), ensureActiveStudent, async (req, res) => {
    const { rating, comment, mealType } = req.body;
    try {
        if (!mealType || !['breakfast', 'lunch', 'dinner'].includes(mealType.toLowerCase())) {
            return res.status(400).json({ msg: 'Valid mealType (breakfast, lunch, dinner) is required' });
        }

        const feedback = new Feedback({
            studentId: req.user.id,
            hostelId: req.user.hostelId,
            rating,
            comment,
            mealType: mealType.toLowerCase()
        });

        await feedback.save();

        // 6. NOTIFICATION TRIGGER (Notify Owner)
        const owner = await User.findOne({ hostelId: req.user.hostelId, role: 'owner' });
        if (owner) {
            await Notification.create({
                userId: owner._id,
                hostelId: req.user.hostelId,
                title: 'New Feedback',
                message: `A student submitted new feedback for ${mealType.toLowerCase()}.`,
                type: 'INFO',
                link: '/owner/feedback'
            });
        }

        res.json({ msg: 'Feedback submitted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/student/balance - REMOVED
// router.get('/balance', ...);

// @route   GET api/student/notifications
// @desc    Get user notifications
// @access  Private (Student)
router.get('/notifications', auth, checkRole(['student']), async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50).lean();
        res.json(notifications);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/student/notifications/:id/read
// @desc    Mark notification as read
// @access  Private (Student)
router.put('/notifications/:id/read', auth, checkRole(['student']), async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ msg: 'Marked as read' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
// @route   GET api/student/settings
// @desc    Get dynamic settings like meal cutoffs
// @access  Private (Student)
router.get('/settings', auth, checkRole(['student']), async (req, res) => {
    try {
        let settings = await Settings.findOne().select('mealCutoffTimes mealBookingCutoffHours').lean();
        if (!settings) {
            settings = { mealCutoffTimes: null };
        }
        res.json(settings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
