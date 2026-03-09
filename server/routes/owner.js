const express = require('express');
const router = express.Router();
console.log("Loading Owner Routes..."); // Debug Log
const mongoose = require('mongoose');
const Menu = require('../models/Menu');
const Attendance = require('../models/Attendance');

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const Hostel = require('../models/Hostel'); // Added
const Settings = require('../models/Settings');
const MealBooking = require('../models/MealBooking'); // Added
const MealIntention = require('../models/MealIntention'); // Added
const Feedback = require('../models/Feedback'); // Added
const FoodItem = require('../models/FoodItem'); // Added
const { auth, checkRole } = require('../middleware/auth');

// @route   GET api/owner/feedback/summary
// @desc    Get aggregated feedback summary for owner's hostel
// @access  Private (Owner)
router.get('/feedback/summary', auth, checkRole(['owner']), async (req, res) => {
    try {
        const { mealType } = req.query;
        const owner = await User.findById(req.user.id);
        if (!owner.hostelId) {
            return res.status(400).json({ msg: 'Owner not assigned to hostel' });
        }

        // Base match: strict aggregation match filter
        const matchStage = {
            hostelId: owner.hostelId,
            mealType: { $in: ['breakfast', 'lunch', 'dinner'] }
        };

        // If specific mealType filter is provided
        if (mealType && ['breakfast', 'lunch', 'dinner'].includes(mealType.toLowerCase())) {
            matchStage.mealType = mealType.toLowerCase();
        }

        const stats = await Feedback.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$hostelId",
                    averageRating: { $avg: "$rating" },
                    totalReviews: { $sum: 1 }
                }
            }
        ]);

        if (stats.length === 0) {
            return res.json({
                averageRating: 0,
                totalReviews: 0
            });
        }

        // Round to 1 decimal place
        const result = {
            averageRating: parseFloat(stats[0].averageRating.toFixed(1)),
            totalReviews: stats[0].totalReviews
        };

        res.json(result);

    } catch (err) {
        console.error("Feedback Summary Error:", err.message);
        res.status(500).send('Server Error');
    }
});
const { spawn } = require('child_process');
const path = require('path');

const fs = require('fs');
const multer = require('multer'); // Added
const AuditLog = require('../models/AuditLog'); // Added for traceability
const { getCutoffTime } = require('../utils/cutoffTimer');
// Simple In-Memory Cache
let dishCache = {
    data: null,
    timestamp: 0,
    duration: 60000 // 1 minute cache
};

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../public/menu-images/custom');
        // Ensure directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate unique filename: custom-timestamp-random.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'custom-' + uniqueSuffix + ext);
    }
});

// File Filter
const fileFilter = (req, file, cb) => {
    // Determine the allowed file types
    const allowedTypes = /jpeg|jpg|png|webp/;
    // Extract the file extension and MIME type
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype);

    if (extName && mimeType) {
        return cb(null, true);
    } else {
        cb(new Error('Only images (jpeg, jpg, png, webp) are allowed!'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

// Helper: Get Dish Breakdown
const getDishBreakdown = async (hostelId, start, end, mealType) => {
    const result = await MealBooking.aggregate([
        {
            $match: {
                hostelId: new mongoose.Types.ObjectId(hostelId),
                date: { $gte: start, $lte: end },
                mealType
            }
        },
        { $unwind: "$items" },
        {
            $group: {
                _id: "$items.itemName",
                total: { $sum: "$items.quantity" }
            }
        },
        {
            $project: {
                name: "$_id",
                quantity: "$total",
                _id: 0
            }
        },
        { $sort: { quantity: -1 } }
    ]);
    return result;
};

// @route   GET api/owner/dashboard
// @desc    Get Owner Dashboard Stats (Updated for Dual-Section System)
// @access  Private (Owner)
router.get('/dashboard', auth, checkRole(['owner']), async (req, res) => {
    try {
        const owner = await User.findById(req.user.id).lean();
        if (!owner.hostelId) return res.status(400).json({ msg: 'Owner not assigned to hostel' });

        // Dates Setup (Server Local Time Logic)
        // Today
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        // Tomorrow
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0, 0);
        const tomorrowEnd = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59, 999);
        const tomorrowDateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

        // 1. TODAY'S PREPARATION (Live)
        // Parallel Queries for Today
        const [
            todayBreakfastBooked, todayBreakfastServed, todayBreakfastDishes,
            todayLunchBooked, todayLunchServed, todayLunchDishes,
            todayDinnerBooked, todayDinnerServed, todayDinnerDishes
        ] = await Promise.all([
            MealBooking.countDocuments({ hostelId: owner.hostelId, date: { $gte: todayStart, $lte: todayEnd }, mealType: 'breakfast' }),
            Attendance.countDocuments({ hostelId: owner.hostelId, date: { $gte: todayStart, $lte: todayEnd }, mealType: 'breakfast' }),
            getDishBreakdown(owner.hostelId, todayStart, todayEnd, 'breakfast'),

            MealBooking.countDocuments({ hostelId: owner.hostelId, date: { $gte: todayStart, $lte: todayEnd }, mealType: 'lunch' }),
            Attendance.countDocuments({ hostelId: owner.hostelId, date: { $gte: todayStart, $lte: todayEnd }, mealType: 'lunch' }),
            getDishBreakdown(owner.hostelId, todayStart, todayEnd, 'lunch'),

            MealBooking.countDocuments({ hostelId: owner.hostelId, date: { $gte: todayStart, $lte: todayEnd }, mealType: 'dinner' }),
            Attendance.countDocuments({ hostelId: owner.hostelId, date: { $gte: todayStart, $lte: todayEnd }, mealType: 'dinner' }),
            getDishBreakdown(owner.hostelId, todayStart, todayEnd, 'dinner')
        ]);

        const todayData = [
            { type: 'Breakfast', finalCount: todayBreakfastBooked, servedCount: todayBreakfastServed, dishes: todayBreakfastDishes, status: 'Closed' }, // Breakfast always closed for booking today
            { type: 'Lunch', finalCount: todayLunchBooked, servedCount: todayLunchServed, dishes: todayLunchDishes, status: 'Closed' },     // Lunch closes at 9:30 AM
            { type: 'Dinner', finalCount: todayDinnerBooked, servedCount: todayDinnerServed, dishes: todayDinnerDishes, status: 'Closed' }    // Dinner closes at 2:30 PM
        ];

        // Refine Status for Today based on Time? 
        // Requirement: "Serving Status Badge". 
        // Let's assume serving is "Live" if within serving window.
        // For now, simpler: user said "Serving Live" or "Serving Closed".
        // Logic: 
        // Breakfast Serving: 7:30 - 9:30
        // Lunch Serving: 12:30 - 14:30
        // Dinner Serving: 19:30 - 21:30
        // We can just send current server time and let frontend decide, OR calculate here.
        // Let's calculate simple "isServing" here.
        const currentHour = now.getHours();
        const currentMin = now.getMinutes();
        const currentTime = currentHour * 60 + currentMin;

        // Serving Windows (Minutes from midnight)
        const servingWindows = {
            breakfast: { start: 7 * 60 + 30, end: 11 * 60 }, // 7:30 - 11:00 (Extended for late eaters/scanning)
            lunch: { start: 12 * 60, end: 16 * 60 },        // 12:00 - 16:00
            dinner: { start: 19 * 60, end: 23 * 60 }        // 19:00 - 23:00
        };

        todayData.forEach(meal => {
            const type = meal.type.toLowerCase();
            const window = servingWindows[type];
            if (currentTime >= window.start && currentTime <= window.end) {
                meal.servingStatus = 'Serving Live';
            } else if (currentTime > window.end) {
                meal.servingStatus = 'Serving Closed';
            } else {
                meal.servingStatus = 'Upcoming';
            }
            // Hard override: If it's closed, it's closed.
            if (meal.type === 'Breakfast' && currentTime > window.end) meal.servingStatus = 'Serving Closed';
        });

        // 2. TOMORROW'S PREPARATION (Planning)
        const [
            tomorrowBreakfastBooked, tomorrowBreakfastDishes,
            tomorrowLunchBooked, tomorrowLunchDishes,
            tomorrowDinnerBooked, tomorrowDinnerDishes
        ] = await Promise.all([
            MealBooking.countDocuments({ hostelId: owner.hostelId, date: { $gte: tomorrowStart, $lte: tomorrowEnd }, mealType: 'breakfast' }),
            getDishBreakdown(owner.hostelId, tomorrowStart, tomorrowEnd, 'breakfast'),

            MealBooking.countDocuments({ hostelId: owner.hostelId, date: { $gte: tomorrowStart, $lte: tomorrowEnd }, mealType: 'lunch' }),
            getDishBreakdown(owner.hostelId, tomorrowStart, tomorrowEnd, 'lunch'),

            MealBooking.countDocuments({ hostelId: owner.hostelId, date: { $gte: tomorrowStart, $lte: tomorrowEnd }, mealType: 'dinner' }),
            getDishBreakdown(owner.hostelId, tomorrowStart, tomorrowEnd, 'dinner')
        ]);

        // Cutoff Logic
        const breakfastCutoff = await getCutoffTime('breakfast', tomorrowDateStr);
        const lunchCutoff = await getCutoffTime('lunch', tomorrowDateStr);
        const dinnerCutoff = await getCutoffTime('dinner', tomorrowDateStr);

        const tomorrowData = [
            {
                type: 'Breakfast',
                expectedCount: tomorrowBreakfastBooked,
                dishes: tomorrowBreakfastDishes,
                cutoffTime: breakfastCutoff,
                isLocked: now > breakfastCutoff
            },
            {
                type: 'Lunch',
                expectedCount: tomorrowLunchBooked,
                dishes: tomorrowLunchDishes,
                cutoffTime: lunchCutoff,
                isLocked: now > lunchCutoff
            },
            {
                type: 'Dinner',
                expectedCount: tomorrowDinnerBooked,
                dishes: tomorrowDinnerDishes,
                cutoffTime: dinnerCutoff,
                isLocked: now > dinnerCutoff
            }
        ];

        // 3. STATS SUMMARY (Aggregated)
        const totalExpectedToday = todayBreakfastBooked + todayLunchBooked + todayDinnerBooked;
        const totalServedToday = todayBreakfastServed + todayLunchServed + todayDinnerServed;

        res.json({
            stats: {
                expectedMeals: totalExpectedToday,
                actualServed: totalServedToday,
                pending: Math.max(0, totalExpectedToday - totalServedToday)
            },
            today: todayData,
            tomorrow: tomorrowData
        });

    } catch (err) {
        console.error("Dashboard Error:", err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET api/owner/preparation-summary
// @desc    Get aggregated preparation counts for a date
// @access  Private (Owner)
router.get('/preparation-summary', auth, checkRole(['owner']), async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ msg: 'Date is required' });
        }

        const owner = await User.findById(req.user.id);
        if (!owner.hostelId) {
            return res.status(400).json({ msg: 'Owner not assigned to hostel' });
        }

        // Construct Day Range
        const startOfDay = new Date(`${date}T00:00:00.000Z`);
        const endOfDay = new Date(`${date}T23:59:59.999Z`);

        // Aggregation Pipeline
        const stats = await MealBooking.aggregate([
            {
                $match: {
                    hostelId: new mongoose.Types.ObjectId(owner.hostelId),
                    date: { $gte: startOfDay, $lte: endOfDay }
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: {
                        mealType: "$mealType",
                        itemName: "$items.itemName"
                    },
                    totalQuantity: { $sum: "$items.quantity" }
                }
            },
            {
                $group: {
                    _id: "$_id.mealType",
                    items: {
                        $push: {
                            item: "$_id.itemName",
                            quantity: "$totalQuantity"
                        }
                    }
                }
            }
        ]);

        // Format Response
        const response = {
            breakfast: [],
            lunch: [],
            dinner: []
        };

        stats.forEach(grp => {
            if (response[grp._id]) {
                response[grp._id] = grp.items.sort((a, b) => b.quantity - a.quantity);
            }
        });

        res.json(response);

    } catch (err) {
        console.error('Preparation Summary Error:', err.message);
        res.status(500).send('Server Error');
    }
});



// @route   GET api/owner/menu
// @desc    Get existing menu for editing
// @access  Private (Owner)
router.get('/menu', auth, checkRole(['owner']), async (req, res) => {
    try {
        const { date, mealType } = req.query;
        if (!date || !mealType) {
            return res.status(400).json({ msg: 'Date and MealType required' });
        }

        const owner = await User.findById(req.user.id);
        if (!owner.hostelId) return res.status(400).json({ msg: 'Owner not assigned to hostel' });

        // Normalize Date
        const parts = date.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        const dateObj = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

        const menu = await Menu.findOne({
            hostelId: owner.hostelId,
            date: dateObj,
            mealType: mealType.toLowerCase()
        }).lean();

        if (!menu) {
            return res.status(404).json({ msg: 'Menu not found' });
        }

        res.json(menu);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/owner/save-menu
// @desc    Save menu for a specific meal type
// @access  Private (Owner)
router.post('/save-menu', auth, checkRole(['owner']), async (req, res) => {
    try {
        const { date, mealType, vegItems, nonVegItems, status, maxDishesPerStudent } = req.body;

        // Parse maxDishesPerStudent (ensure it's a number or null)
        const parsedLimit = maxDishesPerStudent ? parseInt(maxDishesPerStudent) : null;
        const owner = await User.findById(req.user.id);

        if (!owner.hostelId) {
            return res.status(400).json({ msg: 'Owner not assigned to hostel' });
        }

        if (!date || !mealType) {
            return res.status(400).json({ msg: 'Date and Meal Type are required' });
        }

        // DATE NORMALIZATION (CRITICAL - STRICT UTC MIDNIGHT)
        // User Requirement: Normalize to 00:00:00 UTC
        const parts = date.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);

        const dateObj = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

        // Validation: Ensure valid date
        if (isNaN(dateObj.getTime())) {
            return res.status(400).json({ msg: 'Invalid Date Format' });
        }

        // Validation: Ensure dishes are provided
        if ((!vegItems || vegItems.length === 0) && (!nonVegItems || nonVegItems.length === 0)) {
            return res.status(400).json({ msg: 'Menu must contain at least one dish' });
        }

        // CHECK CUTOFF
        // Use Server Local Time for "Now" to match Cutoff Hour Logic
        const now = new Date();
        const nowYear = now.getFullYear();
        const nowMonth = now.getMonth();
        const nowDay = now.getDate();

        // Compare Input Date (year, month, day) with Server Local Date
        const isToday = (year === nowYear && month === nowMonth && day === nowDay);

        if (isToday) {
            let settings = await Settings.findOne();
            const cutoffHours = settings ? settings.mealBookingCutoffHours : 4;
            const mealTimes = { breakfast: 8, lunch: 13, dinner: 20 };

            const normalizedType = mealType.toLowerCase();
            const serviceTime = mealTimes[normalizedType];

            if (serviceTime) {
                const currentHour = now.getHours();
                const cutoffTime = serviceTime - cutoffHours;

                if (currentHour >= cutoffTime) {
                    return res.status(400).json({ msg: `Cannot update ${mealType} menu after cutoff time (${cutoffHours}h before service)` });
                }
            }
        }

        // Normalize mealType
        const normalizedMealType = mealType.toLowerCase();
        if (!['breakfast', 'lunch', 'dinner'].includes(normalizedMealType)) {
            return res.status(400).json({ msg: 'Invalid meal type' });
        }

        // Inject mealType into items
        const formatItems = (items) => items.map(item => ({ ...item, mealType: normalizedMealType }));
        const formattedVeg = formatItems(vegItems || []);
        const formattedNonVeg = formatItems(nonVegItems || []);

        // Update or Insert
        const menu = await Menu.findOneAndUpdate(
            {
                hostelId: owner.hostelId,
                date: dateObj,
                mealType: normalizedMealType
            },
            {
                $set: {
                    vegItems: formattedVeg,
                    nonVegItems: nonVegItems || [],
                    status: status || 'DRAFT',
                    maxDishesPerStudent: parsedLimit // Default to DRAFT if not specified
                }
            },
            { new: true, upsert: true }
        );

        // AUDIT LOGGING
        try {
            const logEntry = new AuditLog({
                action: status === 'PUBLISHED' ? 'MENU_PUBLISHED' : 'MENU_UPDATED',
                performedBy: req.user.id,
                targetHostel: owner.hostelId,
                details: {
                    date: date,
                    mealType: normalizedMealType,
                    itemCount: (vegItems || []).length + (nonVegItems || []).length,
                    status: status || 'DRAFT'
                }
            });
            await logEntry.save();

            // NOTIFICATION TRIGGER
            if (status === 'PUBLISHED') {
                const Notification = require('../models/Notification');

                // 1. Notify Owner (Confirmation)
                await Notification.create({
                    userId: req.user.id,
                    hostelId: owner.hostelId,
                    title: 'Menu Published',
                    message: `${normalizedMealType} menu for ${date} has been published successfully.`,
                    type: 'success',
                    relatedId: `PUBLISH-${date}-${normalizedMealType}`,
                    link: '/owner/menu'
                });

                // 2. Notify Students (Broadcast)
                const students = await User.find({ role: 'student', hostelId: owner.hostelId }).select('_id');
                if (students.length > 0) {
                    const studentNotifs = students.map(s => ({
                        userId: s._id,
                        hostelId: owner.hostelId,
                        title: 'Menu Updated',
                        message: `${normalizedMealType} menu for ${date} is now available.`,
                        type: 'MENU_UPDATE',
                        relatedId: `MENU-${date}-${normalizedMealType}`,
                        link: '/student/weekly-menu'
                    }));

                    // Use insertMany with ordered:false to ignore dupes provided by relatedId index
                    try {
                        await Notification.insertMany(studentNotifs, { ordered: false });
                    } catch (e) { /* Ignore dupe errors */ }
                }
            }

        } catch (logErr) {
            console.error("Audit/Notification Error:", logErr.message);
        }

        res.json(menu);

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   POST api/owner/scan

// @route   GET api/owner/dishes
// @desc    Get available food items with filters
// @access  Private (Owner)
router.get('/dishes', auth, checkRole(['owner']), async (req, res) => {
    try {
        const { search, category, vegOrNonVeg, mealType, page = 1, limit = 20, vegType } = req.query;

        // CACHE HIT? (Only for default view: no search, default filters)
        const isDefaultView = !search && (!category || category === 'All') && (!vegOrNonVeg || vegOrNonVeg === 'all') && (!vegType || vegType === 'all');

        if (isDefaultView && dishCache.data && (Date.now() - dishCache.timestamp < dishCache.duration)) {
            // Return cached data
            return res.json(dishCache.data);
        }

        // Check for owner hostel mapping
        const owner = await User.findById(req.user.id);
        if (!owner) {
            return res.status(404).json({ msg: 'Owner not found' });
        }

        console.log(`[DEBUG] GET /dishes - Owner: ${owner.email}, HostelId: ${owner.hostelId}`);
        if (!owner.hostelId) {
            console.warn(`[WARNING] Owner ${owner.email} has no Hostel ID assigned!`);
        }

        let query = {
            $or: [
                { ownerId: null }, // Global items
                { ownerId: req.user.id } // Custom owner items
            ],
            isActive: { $ne: false }
        };

        if (search) {
            query.foodName = { $regex: search, $options: 'i' };
        }

        if (category && category !== 'All') {
            query.category = category;
        }

        let vType = vegOrNonVeg || vegType;
        if (vType && vType !== 'all') {
            query.vegOrNonVeg = vType;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const items = await FoodItem.find(query)
            .sort({ foodName: 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(); // Optimize performance

        // Optional: Get total count for frontend strict pagination
        const total = await FoodItem.countDocuments(query);

        console.log(`[DEBUG] GET /dishes - Found ${total} items for query.`);

        const responseData = {
            success: true,
            count: items.length,
            total,
            dishes: items
        };

        if (isDefaultView && page == 1) {
            dishCache.data = responseData;
            dishCache.timestamp = Date.now();
        }

        res.json(responseData);
    } catch (err) {
        console.error('Error fetching dishes:', err.message);
        // Ensure valid JSON return even on error
        res.status(500).json({ success: false, msg: 'Error loading dishes', dishes: [] });
    }
});

// @route   POST /api/owner/add-custom-dish
// @desc    Add a custom dish to the catalog
// @access  Private (Owner)
router.post('/add-custom-dish', auth, upload.single('image'), async (req, res) => {
    try {
        const { foodName, category, vegOrNonVeg, price } = req.body;

        if (!foodName || !vegOrNonVeg || !category) {
            return res.status(400).json({ msg: 'Please provide all required fields' });
        }

        const owner = await User.findById(req.user.id);

        // CHECK DUPLICATE
        const existing = await FoodItem.findOne({
            foodName: { $regex: new RegExp(`^${foodName}$`, 'i') },
            $or: [{ ownerId: owner._id }, { ownerId: null }]
        });

        if (existing) {
            return res.status(400).json({ msg: 'A dish with this name already exists.' });
        }

        let imageUrl = '/menu-images/placeholder.jpg';
        if (req.file) {
            imageUrl = `/menu-images/custom/${req.file.filename}`;
        } else {
            return res.status(400).json({ msg: 'Image is mandatory for custom dishes' });
        }

        const newDish = new FoodItem({
            foodName,
            normalizedName: foodName.toLowerCase().replace(/ /g, '-'),
            imageUrl,
            category,
            vegOrNonVeg,
            price: Number(price) || 0,
            isCustomDish: true,
            ownerId: owner._id
        });

        await newDish.save();

        // INVALIDATE CACHE
        dishCache.data = null;

        res.json(newDish);

    } catch (err) {
        console.error(err.message);
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Server Error');
    }
});

// LEGACY ROUTE SUPPORT (Redirecting to new logic or deprecated)
// Keeping this for backward compatibility if needed, but the new UI will use /dishes
router.get('/food-catalog', auth, checkRole(['owner']), async (req, res) => {
    // Redirect logic to /dishes internally
    try {
        const items = await FoodItem.find({ $or: [{ ownerId: null }, { ownerId: req.user.id }] });
        res.json(items);
    } catch (err) {
        res.status(500).json({ msg: 'Error loading food catalog' });
    }
});

// @route   PUT /api/owner/dishes/:id
// @desc    Update a custom dish
// @access  Private (Owner)
router.put('/dishes/:id', auth, checkRole(['owner']), upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { foodName, category, vegOrNonVeg, price } = req.body;

        const dish = await FoodItem.findById(id);

        if (!dish) {
            return res.status(404).json({ msg: 'Dish not found' });
        }

        // Verify Ownership
        if (!dish.isCustomDish || dish.ownerId?.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'You do not have permission to edit this dish.' });
        }

        if (foodName) {
            // Check for duplicate names (excluding current dish)
            const existing = await FoodItem.findOne({
                _id: { $ne: id },
                foodName: { $regex: new RegExp(`^${foodName}$`, 'i') },
                $or: [{ ownerId: req.user.id }, { ownerId: null }]
            });

            if (existing) {
                return res.status(400).json({ msg: 'A dish with this name already exists.' });
            }

            dish.foodName = foodName;
            dish.normalizedName = foodName.toLowerCase().replace(/ /g, '-');
        }

        if (category) dish.category = category;
        if (vegOrNonVeg) dish.vegOrNonVeg = vegOrNonVeg;
        if (price !== undefined) dish.price = Number(price);

        // Optional new image parsing via multer
        if (req.file) {
            dish.imageUrl = `/menu-images/custom/${req.file.filename}`;
        }

        await dish.save();

        // INVALIDATE CACHE
        dishCache.data = null;

        res.json(dish);

    } catch (err) {
        console.error('Error updating dish: ', err.message);
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ msg: err.message });
        }
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Dish not found.' });
        }
        res.status(500).json({ msg: err.message, stack: err.stack });
    }
});

// @route   DELETE /api/owner/dishes/:id
// @desc    Delete a custom dish globally
// @access  Private (Owner)
router.delete('/dishes/:id', auth, checkRole(['owner']), async (req, res) => {
    try {
        const { id } = req.params;
        const dish = await FoodItem.findById(id);

        if (!dish) {
            return res.status(404).json({ msg: 'Dish not found' });
        }

        // Verify Ownership
        if (!dish.isCustomDish || dish.ownerId?.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'You do not have permission to delete this dish.' });
        }

        // Note: Safely hides from master list, but historical menus contain embedded references 
        // which remains safe, solving referential constraint issues elegantly.
        dish.isActive = false;
        await dish.save();

        // INVALIDATE CACHE
        dishCache.data = null;

        res.json({ msg: 'Dish successfully deleted from local catalog.' });
    } catch (err) {
        console.error('Error deleting dish:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Dish not found.' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   POST api/owner/upload-image
// @desc    Upload custom food image
// @access  Private (Owner)
router.post('/upload-image', auth, checkRole(['owner']), upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No image file provided' });
        }

        // Return the web-accessible path
        const imageUrl = `/menu-images/custom/${req.file.filename}`;

        res.json({
            success: true,
            imageUrl: imageUrl,
            filename: req.file.filename
        });
    } catch (err) {
        console.error('Image upload error:', err.message);
        res.status(500).json({ msg: 'Image upload failed', error: err.message });
    }
});

// @route   POST api/owner/scan
// @desc    Scan QR Code & Mark Attendance
// @access  Private (Owner)
// @route   POST api/owner/scan
// @desc    Scan student QR code and mark attendance
// @access  Private (Owner)
router.post('/scan', auth, checkRole(['owner']), async (req, res) => {
    try {
        const { qrData } = req.body;
        const owner = await User.findById(req.user.id);

        if (!owner.hostelId) {
            return res.status(400).json({ msg: 'Owner not assigned to hostel' });
        }

        // 1. Identify Student
        const jwt = require('jsonwebtoken');
        let parsedQr;

        try {
            // Attempt to verify secure JWT signature
            parsedQr = jwt.verify(qrData, process.env.JWT_SECRET);
        } catch (e) {
            // Fallback for legacy local testing or old screenshots during deployment
            try {
                if (typeof qrData === 'string' && qrData.startsWith('{')) {
                    parsedQr = JSON.parse(qrData);
                } else {
                    return res.status(400).json({ msg: 'Invalid or expired secure QR code.' });
                }
            } catch (err) {
                return res.status(400).json({ msg: 'Invalid QR format.' });
            }
        }

        let queryStudentId = parsedQr.studentId || parsedQr;

        let student = await User.findOne({ studentId: queryStudentId });

        if (!student) {
            return res.status(404).json({ msg: 'Student not found.' });
        }

        if (student.hostelId.toString() !== owner.hostelId.toString()) {
            return res.status(403).json({ msg: 'Student belongs to a different hostel.' });
        }

        // 2. Normalize Date for Today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today.getTime() + 86400000);

        // 3. Detect Meal Type using exact Hours and Minutes
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        let detectedMealType = null;

        // Breakfast: 07:30 - 09:30
        if ((hours === 7 && minutes >= 30) || hours === 8 || (hours === 9 && minutes <= 30)) {
            detectedMealType = 'breakfast';
        }
        // Lunch: 12:30 - 14:30
        else if ((hours === 12 && minutes >= 30) || hours === 13 || (hours === 14 && minutes <= 30)) {
            detectedMealType = 'lunch';
        }
        // Dinner: 19:30 - 21:30
        else if ((hours === 19 && minutes >= 30) || hours === 20 || (hours === 21 && minutes <= 30)) {
            detectedMealType = 'dinner';
        }

        if (!detectedMealType) {
            return res.status(400).json({ msg: 'No active serving window. (B: 07:30-09:30, L: 12:30-14:30, D: 19:30-21:30)' });
        }

        // 4. Query Booking strictly for the detected mealType
        const bookingQuery = {
            studentId: student._id,
            hostelId: new mongoose.Types.ObjectId(owner.hostelId),
            mealType: { $regex: new RegExp(`^${detectedMealType}$`, "i") },
            date: {
                $gte: new Date(today.toISOString()),
                $lt: new Date(tomorrow.toISOString())
            }
        };

        let booking = await MealBooking.findOne(bookingQuery);

        if (!booking) {
            // Check MealIntention for 'present'
            const intentionQuery = {
                studentId: student._id,
                hostelId: new mongoose.Types.ObjectId(owner.hostelId),
                mealType: { $regex: new RegExp(`^${detectedMealType}$`, "i") },
                date: {
                    $gte: new Date(today.toISOString()),
                    $lt: new Date(tomorrow.toISOString())
                },
                status: 'present'
            };
            const intention = await MealIntention.findOne(intentionQuery);

            if (!intention) {
                return res.status(404).json({ msg: `Student has not booked ${detectedMealType} and is not marked present for today.` });
            }

            // Mock a booking in memory
            booking = {
                mealType: detectedMealType,
                date: new Date(),
                items: [{ itemName: "Common Meal", quantity: 1 }]
            };
        }

        // 5. Prevent Double Serving for THIS specific meal
        const existingAttendance = await Attendance.findOne({
            studentId: student._id,
            date: { $gte: today, $lt: tomorrow },
            mealType: detectedMealType
        });

        if (existingAttendance) {
            return res.status(400).json({ msg: `Student already served ${detectedMealType} today.` });
        }

        // 6. Mark Attendance
        const attendance = new Attendance({
            studentId: student._id,
            hostelId: owner.hostelId,
            date: booking.date,
            mealType: detectedMealType,
            status: 'present'
        });
        await attendance.save();

        // 7. Calculate Total Plates
        const totalPlates = booking.items.reduce((sum, item) => sum + item.quantity, 0);

        // 8. Return Success Verification Response
        res.json({
            success: true,
            msg: 'Verification Successful',
            studentName: student.name,
            mealType: booking.mealType.charAt(0).toUpperCase() + booking.mealType.slice(1),
            items: booking.items,
            totalPlates: totalPlates,
            timestamp: now.toLocaleTimeString()
        });

    } catch (err) {
        console.error("Scan Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PATCH api/owner/students/:id/status
// @desc    Update student status (Active/Inactive)
// @access  Private (Owner)
router.patch('/students/:id/status', auth, checkRole(['owner']), async (req, res) => {
    try {
        const { status } = req.body;

        // Validate Status
        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ msg: 'Invalid status. Use active or inactive.' });
        }

        const owner = await User.findById(req.user.id);
        const student = await User.findById(req.params.id);

        if (!student) {
            return res.status(404).json({ msg: 'Student not found' });
        }

        // Ownership Check
        if (student.hostelId.toString() !== owner.hostelId.toString()) {
            return res.status(403).json({ msg: 'Not authorized to manage this student' });
        }

        student.status = status;
        await student.save();

        // Audit Log
        await AuditLog.create({
            action: 'STUDENT_STATUS_UPDATE',
            performedBy: req.user.id,
            targetHostel: owner.hostelId,
            details: {
                studentId: student._id,
                studentName: student.name,
                newStatus: status
            }
        });

        res.json(student);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/owner/students
// @desc    Get all students for the owner's hostel
// @access  Private (Owner)
router.get('/students', auth, checkRole(['owner']), async (req, res) => {
    try {
        const { search } = req.query;
        const owner = await User.findById(req.user.id);

        if (!owner.hostelId) {
            return res.status(400).json({ msg: 'Owner not assigned to hostel' });
        }

        let query = {
            role: 'student',
            hostelId: owner.hostelId
        };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { studentId: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const students = await User.find(query)
            .select('-password')
            .sort({ name: 1 })
            .lean();

        res.json({
            students,
            totalStudents: students.length
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/owner/live-stats
// @desc    Get live stats for the current/upcoming meal
// @access  Private (Owner)
router.get('/live-stats', auth, checkRole(['owner']), async (req, res) => {
    try {
        const owner = await User.findById(req.user.id);
        if (!owner.hostelId) {
            return res.status(400).json({ msg: 'Owner not assigned to hostel' });
        }

        // Determine current meal type based on time
        const now = new Date();
        const currentHour = now.getHours();
        let mealType = 'dinner'; // Default

        if (currentHour < 11) mealType = 'breakfast';
        else if (currentHour >= 11 && currentHour < 17) mealType = 'lunch';

        // Construct Today's Date (Local Server Time YYYY-MM-DD)
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        // Date Range for Query (UTC Midnight to Midnight)
        // We need to match how dates are stored.
        // If stored as UTC Midnight:
        const startOfDay = new Date(Date.UTC(year, now.getMonth(), now.getDate(), 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(year, now.getMonth(), now.getDate(), 23, 59, 59, 999));

        // Use strict date matching if stored as string, or range if stored as Date object.
        // MealBookings stores 'date' as Date object (UTC Midnight).
        // Attendance stores 'date' as Date object (UTC Midnight) or String? 
        // Attendance schema usually Date. Let's use range to be safe.

        const [totalBooked, totalScanned, sessionTotalPresent] = await Promise.all([
            MealBooking.countDocuments({
                hostelId: owner.hostelId,
                date: { $gte: startOfDay, $lte: endOfDay },
                mealType: mealType
            }),
            Attendance.countDocuments({
                hostelId: owner.hostelId,
                date: { $gte: startOfDay, $lte: endOfDay },
                mealType: mealType
            }),
            MealIntention.countDocuments({
                hostelId: owner.hostelId,
                date: { $gte: startOfDay, $lte: endOfDay },
                mealType: mealType,
                status: 'present'
            })
        ]);

        res.json({
            totalBooked,
            totalScanned,
            sessionTotalPresent,
            remaining: Math.max(0, sessionTotalPresent - totalScanned),
            mealType,
            date: todayStr
        });

    } catch (err) {
        console.error("Live Stats Error:", err.message);
        res.status(500).send('Server Error');
    }
});


// @route   GET api/owner/feedback
// @desc    Get all feedback for the owner's hostel
// @access  Private (Owner)
router.get('/feedback', auth, checkRole(['owner']), async (req, res) => {
    try {
        const { mealType } = req.query;
        const owner = await User.findById(req.user.id);
        if (!owner.hostelId) {
            return res.status(400).json({ msg: 'Owner not assigned to hostel' });
        }

        const query = {
            hostelId: owner.hostelId,
            mealType: { $in: ['breakfast', 'lunch', 'dinner'] }
        };

        if (mealType && ['breakfast', 'lunch', 'dinner'].includes(mealType.toLowerCase())) {
            query.mealType = mealType.toLowerCase();
        }

        const feedbacks = await Feedback.find(query)
            .populate('studentId', 'name email')
            .sort({ createdAt: -1 });

        res.json(feedbacks);

    } catch (err) {
        console.error("Feedback Fetch Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/owner/attendance-grid
// @desc    Get daily attendance grid for all students
// @access  Private (Owner)
router.get('/attendance-grid', auth, checkRole(['owner']), async (req, res) => {
    try {
        const { date, search } = req.query;
        const owner = await User.findById(req.user.id);

        if (!owner.hostelId) {
            return res.status(400).json({ msg: 'Owner not assigned to hostel' });
        }

        // 1. Build Date Range (UTC Midnight to Midnight)
        // Client sends YYYY-MM-DD
        const targetDate = date || new Date().toISOString().split('T')[0];
        const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
        const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

        // 2. Fetch All Students (Active & Inactive)
        let studentQuery = {
            hostelId: owner.hostelId,
            role: 'student'
        };

        if (search) {
            studentQuery.$or = [
                { name: { $regex: search, $options: 'i' } },
                { studentId: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } } // Optional
            ];
        }

        const students = await User.find(studentQuery)
            .select('name rollNumber studentId status email')
            .sort({ name: 1 })
            .lean();

        // 3. Fetch Attendance for the Date
        const attendanceRecords = await Attendance.find({
            hostelId: owner.hostelId,
            date: { $gte: startOfDay, $lte: endOfDay }
        }).lean();

        // 4. Map Attendance to Students
        // Create a map for quick lookup: studentId -> { breakfast: boolean, lunch: boolean, dinner: boolean }
        const attendanceMap = {};

        attendanceRecords.forEach(record => {
            const sId = record.studentId.toString();
            if (!attendanceMap[sId]) attendanceMap[sId] = {};

            // normalize meal type just in case
            const mType = record.mealType ? record.mealType.toLowerCase() : '';
            attendanceMap[sId][mType] = {
                status: 'Present', // Or record.status
                time: record.date // Scan time
            };
        });

        // 5. Build Response Grid
        const grid = students.map(student => {
            const sId = student._id.toString();
            const att = attendanceMap[sId] || {};

            return {
                studentId: sId,
                name: student.name,
                rollNumber: student.rollNumber || student.studentId || 'N/A',
                status: student.status, // active/inactive
                attendance: {
                    breakfast: !!att['breakfast'],
                    lunch: !!att['lunch'],
                    dinner: !!att['dinner']
                }
            };
        });

        res.json({ success: true, date: targetDate, grid });

    } catch (err) {
        console.error("Attendance Grid Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/owner/attendance/export
// @desc    Export attendance as CSV
// @access  Private (Owner)
router.get('/attendance/export', auth, checkRole(['owner']), async (req, res) => {
    try {
        const { date, search } = req.query;
        const owner = await User.findById(req.user.id);

        if (!owner.hostelId) {
            return res.status(400).json({ msg: 'Owner not assigned to hostel' });
        }

        // 1. Data Fetching (Reusing Grid Logic)
        const targetDate = date || new Date().toISOString().split('T')[0];
        const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
        const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

        let studentQuery = { hostelId: owner.hostelId, role: 'student' };
        if (search) {
            studentQuery.$or = [
                { name: { $regex: search, $options: 'i' } },
                { studentId: { $regex: search, $options: 'i' } }
            ];
        }

        const students = await User.find(studentQuery).sort({ name: 1 }).lean();
        const attendanceRecords = await Attendance.find({
            hostelId: owner.hostelId,
            date: { $gte: startOfDay, $lte: endOfDay }
        }).lean();

        const attendanceMap = {};
        attendanceRecords.forEach(record => {
            const sId = record.studentId.toString();
            if (!attendanceMap[sId]) attendanceMap[sId] = {};
            attendanceMap[sId][record.mealType] = true;
        });

        // 2. CSV Generation
        let csvContent = "Student Name,Status,Breakfast,Lunch,Dinner\n";

        // Time Window Logic Helpers
        const now = new Date();
        const currentHour = now.getHours();
        const currentMin = now.getMinutes();
        const timeVal = currentHour + currentMin / 60;
        const todayStr = now.toISOString().split('T')[0];

        const isToday = targetDate === todayStr;
        const isPast = targetDate < todayStr;
        // Future is implied if not today and not past

        const getStatus = (mealType, attended) => {
            if (attended) return 'Present';

            if (isPast) return 'Missed';
            if (!isToday) return 'Upcoming'; // Future

            // It's Today, check windows
            let start, end;
            if (mealType === 'breakfast') { start = 7.5; end = 9.5; }
            else if (mealType === 'lunch') { start = 12.5; end = 14.5; }
            else { start = 19.5; end = 21.5; }

            if (timeVal < start) return 'Upcoming';
            if (timeVal >= start && timeVal <= end) return 'Pending';
            return 'Missed';
        };

        students.forEach(student => {
            const sId = student._id.toString();
            const att = attendanceMap[sId] || {};

            // Student Status (Active/Inactive) - Capitalized
            const statusStr = student.status ? student.status.charAt(0).toUpperCase() + student.status.slice(1) : 'Unknown';

            // Meal Statuses
            const bStatus = getStatus('breakfast', att['breakfast']);
            const lStatus = getStatus('lunch', att['lunch']);
            const dStatus = getStatus('dinner', att['dinner']);

            // Escape fields for CSV safety
            const safeName = `"${student.name.replace(/"/g, '""')}"`;

            csvContent += `${safeName},${statusStr},${bStatus},${lStatus},${dStatus}\n`;
        });

        // 3. Send Response
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=attendance-${targetDate}.csv`);
        res.status(200).send(csvContent);

    } catch (err) {
        console.error("Export Error:", err.message);
        res.status(500).send("Export Failed");
    }
});

// @route   GET api/owner/reports/performance
// @desc    Get aggregated performance and revenue analytics for Owner Reports
// @access  Private (Owner)
router.get('/reports/performance', auth, checkRole(['owner']), async (req, res) => {
    try {
        const owner = await User.findById(req.user.id);
        console.log("--- DEBUG OWNER REPORTS API ---");
        console.log("req.user Context:", req.user);
        console.log("Owner Hostel ID:", owner.hostelId);
        if (!owner.hostelId) {
            return res.status(400).json({ msg: 'Owner not assigned to hostel' });
        }

        const testBookings = await MealBooking.find({});
        console.log("Total Bookings in DB:", testBookings.length);

        const ownerBookings = await MealBooking.find({ hostelId: owner.hostelId });
        console.log("Total Bookings for Owner's Hostel:", ownerBookings.length);

        const now = new Date();
        const endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));

        const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
        startDate.setUTCDate(startDate.getUTCDate() - 6); // Last 7 days

        console.log("Date Range:", { startDate, endDate });

        // 1. Weekly Consumption Trend (MealBooking aggregation)
        const consumptionPipeline = [
            {
                $match: {
                    hostelId: new mongoose.Types.ObjectId(owner.hostelId),
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: {
                        dateStr: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        mealType: "$mealType"
                    },
                    count: { $sum: "$items.quantity" }
                }
            }
        ];

        const rawConsumption = await MealBooking.aggregate(consumptionPipeline);

        // Structure consumption data
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const chartData = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
            d.setUTCDate(d.getUTCDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = days[d.getUTCDay()];

            const breakfastCount = rawConsumption.find(c => c._id.dateStr === dateStr && c._id.mealType === 'breakfast')?.count || 0;
            const lunchCount = rawConsumption.find(c => c._id.dateStr === dateStr && c._id.mealType === 'lunch')?.count || 0;
            const dinnerCount = rawConsumption.find(c => c._id.dateStr === dateStr && c._id.mealType === 'dinner')?.count || 0;

            chartData.push({
                name: dayName,
                date: dateStr,
                total: breakfastCount + lunchCount + dinnerCount,
                breakfast: breakfastCount,
                lunch: lunchCount,
                dinner: dinnerCount
            });
        }

        // 2. Revenue Calculation using FoodItem prices
        const revenuePipeline = [
            {
                $match: {
                    hostelId: new mongoose.Types.ObjectId(owner.hostelId),
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            { $unwind: "$items" },
            {
                // We assume FoodItem stores prices and foodName matches itemName
                $lookup: {
                    from: "fooditems",
                    localField: "items.itemName",
                    foreignField: "foodName",
                    as: "foodDetails"
                }
            },
            {
                $unwind: { path: "$foodDetails", preserveNullAndEmptyArrays: true }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    totalRevenue: {
                        $sum: {
                            $multiply: ["$items.quantity", { $ifNull: ["$foodDetails.price", 0] }]
                        }
                    }
                }
            }
        ];

        const rawRevenue = await MealBooking.aggregate(revenuePipeline);

        // Map revenue by date
        const revenueByDate = {};
        rawRevenue.forEach(r => {
            revenueByDate[r._id] = r.totalRevenue;
        });

        // Add revenue to the day structure or return separated
        const revenueTrend = chartData.map(day => ({
            name: day.name,
            total: revenueByDate[day.date] || 0
        }));

        // 3. Top Items Pipeline
        const topItemsPipeline = [
            {
                $match: {
                    hostelId: new mongoose.Types.ObjectId(owner.hostelId),
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.itemName",
                    count: { $sum: "$items.quantity" }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ];

        const rawTopItems = await MealBooking.aggregate(topItemsPipeline);

        const topItems = rawTopItems.map(item => ({
            name: item._id,
            count: item.count
        }));

        // 4. Wastage Calculation (Prepared/Booked minus Attended)
        const attendancePipeline = [
            {
                $match: {
                    hostelId: owner.hostelId,
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    count: { $sum: 1 }
                }
            }
        ];

        const rawAttendance = await Attendance.aggregate(attendancePipeline);
        const attendanceByDate = {};
        rawAttendance.forEach(a => { attendanceByDate[a._id] = a.count; });

        const wastageTrend = chartData.map(day => {
            const booked = day.total;
            const attended = attendanceByDate[day.date] || 0;
            return {
                name: day.name,
                today: Math.max(0, booked - attended),
                average: 0 // Simplification unless historical average across months is calculated
            };
        });

        const totalStudents = await User.countDocuments({ role: 'student', hostelId: owner.hostelId });

        res.json({
            success: true,
            totalStudents,
            chartData,          // Meal consumption array
            revenueTrend,       // Exact revenue aggregated from DB
            topItems,
            wastageTrend        // Real daily wastage array
        });

    } catch (err) {
        console.error("Owner Performance Reports Error:", err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   GET api/owner/expected-count
// @desc    Get expected meal headcount based on MealIntention
// @access  Private (Owner)
router.get('/expected-count', auth, checkRole(['owner']), async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ msg: 'Date is required' });
        }

        const owner = await User.findById(req.user.id);
        if (!owner.hostelId) {
            return res.status(400).json({ msg: 'Owner not assigned to hostel' });
        }

        const parts = date.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        const dateObj = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

        // 1. Fetch total active students in owner's hostel
        const activeStudents = await User.find({
            role: 'student',
            hostelId: owner.hostelId,
            status: 'active'
        }).select('name studentId email').lean();

        const totalActive = activeStudents.length;

        // 2. Fetch Meal Intentions for the given date
        const intentions = await MealIntention.find({
            hostelId: owner.hostelId,
            date: dateObj
        }).populate('studentId', 'name studentId email').lean();

        // 3. Initialize Response Structure
        const responseData = {
            breakfast: { present: { count: 0, students: [] }, notComing: { count: 0, students: [] }, notResponded: { count: 0, students: [] } },
            lunch: { present: { count: 0, students: [] }, notComing: { count: 0, students: [] }, notResponded: { count: 0, students: [] } },
            dinner: { present: { count: 0, students: [] }, notComing: { count: 0, students: [] }, notResponded: { count: 0, students: [] } }
        };

        const mealTypes = ['breakfast', 'lunch', 'dinner'];

        // Group intentions
        const groupedIntentions = { breakfast: [], lunch: [], dinner: [] };
        intentions.forEach(i => {
            if (groupedIntentions[i.mealType]) {
                groupedIntentions[i.mealType].push(i);
            }
        });

        // 4. Calculate for each meal
        mealTypes.forEach(meal => {
            const mealIntentions = groupedIntentions[meal];

            const presentStudents = mealIntentions.filter(i => i.status === 'present').map(i => i.studentId);
            const notComingStudents = mealIntentions.filter(i => i.status === 'not_coming').map(i => i.studentId);

            // Find students who haven't responded
            const respondedStudentIds = mealIntentions.map(i => i.studentId._id.toString());
            const notRespondedStudents = activeStudents.filter(s => !respondedStudentIds.includes(s._id.toString()));

            responseData[meal].present.count = presentStudents.length;
            responseData[meal].present.students = presentStudents.filter(s => s !== null) ?? [];

            responseData[meal].notComing.count = notComingStudents.length;
            responseData[meal].notComing.students = notComingStudents.filter(s => s !== null) ?? [];

            responseData[meal].notResponded.count = notRespondedStudents.length;
            responseData[meal].notResponded.students = notRespondedStudents ?? [];

            const computedTotal = responseData[meal].present.count + responseData[meal].notComing.count + responseData[meal].notResponded.count;
            if (computedTotal !== totalActive) {
                console.warn('[Integrity Warning] Expected count mismatch', {
                    date,
                    hostelId: owner.hostelId,
                    meal,
                    expectedTotal: totalActive,
                    computedTotal
                });
            }
        });

        res.json({
            success: true,
            message: 'Expected count retrieved',
            data: responseData
        });
    } catch (err) {
        console.error('Expected Count Error:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET api/owner/expected-count/master
// @desc    Get complete list of students with their meal intentions
// @access  Private (Owner)
router.get('/expected-count/master', auth, checkRole(['owner']), async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ success: false, message: 'Date is required' });
        }

        const owner = await User.findById(req.user.id);
        if (!owner.hostelId) {
            return res.status(400).json({ success: false, message: 'Owner not assigned to hostel' });
        }

        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid date format' });
        }

        // Fetch all students assigned to this hostel
        const students = await User.find({ role: 'student', hostelId: owner.hostelId })
            .select('_id name studentId email')
            .lean();

        // Fetch all intentions for the date
        const intentions = await MealIntention.find({
            hostelId: owner.hostelId,
            date: dateObj
        }).lean();

        // Group intentions by student
        const intentionMap = {};
        intentions.forEach(i => {
            const sId = i.studentId.toString();
            if (!intentionMap[sId]) {
                intentionMap[sId] = { breakfast: 'not_responded', lunch: 'not_responded', dinner: 'not_responded' };
            }
            if (['breakfast', 'lunch', 'dinner'].includes(i.mealType)) {
                intentionMap[sId][i.mealType] = i.status;
            }
        });

        // Map onto student list
        const masterList = students.map(student => {
            const sId = student._id.toString();
            const sIntentions = intentionMap[sId] || { breakfast: 'not_responded', lunch: 'not_responded', dinner: 'not_responded' };

            return {
                _id: student._id,
                name: student.name,
                studentId: student.studentId,
                email: student.email,
                breakfast: sIntentions.breakfast,
                lunch: sIntentions.lunch,
                dinner: sIntentions.dinner
            };
        });

        res.json({
            success: true,
            message: 'Master intention list retrieved',
            data: { students: masterList }
        });

    } catch (err) {
        console.error('Master Expected Count Error:', err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;
