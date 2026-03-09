const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // Added for transactions
const User = require('../models/User');
const Hostel = require('../models/Hostel');
const MealIntention = require('../models/MealIntention');
const MealBooking = require('../models/MealBooking');
const Attendance = require('../models/Attendance');
const Transaction = require('../models/Transaction');
const PilotReport = require('../models/PilotReport');
const Notification = require('../models/Notification');
const Settings = require('../models/Settings');
const Menu = require('../models/Menu');
const { auth, checkRole } = require('../middleware/auth');
const auditLog = require('../models/AuditLog');
const bcrypt = require('bcryptjs');
const AuditLog = require('../models/AuditLog'); // Added
const Feedback = require('../models/Feedback'); // Added

// @route   GET api/admin/hostels/ratings
// @desc    Get average ratings for all hostels
// @access  Private (Admin)
router.get('/hostels/ratings', auth, checkRole(['admin']), async (req, res) => {
    try {
        const ratings = await Feedback.aggregate([
            {
                $group: {
                    _id: "$hostelId",
                    averageRating: { $avg: "$rating" },
                    totalReviews: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "hostels",
                    localField: "_id",
                    foreignField: "_id",
                    as: "hostel"
                }
            },
            {
                $unwind: "$hostel"
            },
            {
                $project: {
                    hostelId: "$_id",
                    hostelName: "$hostel.name",
                    averageRating: { $round: ["$averageRating", 1] },
                    totalReviews: 1,
                    _id: 0
                }
            }
        ]);

        res.json(ratings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/stats
// @desc    Get Admin Dashboard Stats
// @access  Private (Admin)
router.get('/stats', auth, checkRole(['admin']), async (req, res) => {
    try {
        const totalHostels = await Hostel.countDocuments();
        const totalStudents = await User.countDocuments({ role: 'student' });

        // Get today's expected meals
        // Get today's expected meals (UTC Midnight to match DB)
        const now = new Date();
        const startOfDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));

        const todaysMeals = await MealIntention.countDocuments({
            date: { $gte: startOfDay, $lte: endOfDay },
            status: 'present'
        });

        const dynamicAlerts = [];

        // Check for Missing Menus Tomorrow
        const tomorrowStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0));
        const tomorrowEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999));

        const publishedMenusCount = await Menu.countDocuments({
            date: { $gte: tomorrowStart, $lte: tomorrowEnd },
            status: 'PUBLISHED'
        });

        const activeHostels = await Hostel.countDocuments();

        // Assuming 3 meals per active hostel
        const expectedMenus = activeHostels * 3;

        if (publishedMenusCount < expectedMenus) {
            dynamicAlerts.push(`${expectedMenus - publishedMenusCount} Menus missing for tomorrow`);
        }

        // Attendance Alert (Arbitrary logic: if booked is significantly higher than attendance for yesterday/today)
        // Here we track yesterday's total unserved plates
        const yesterdayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0));
        const yesterdayEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999));

        const yesterdayBooked = await MealBooking.countDocuments({ date: { $gte: yesterdayStart, $lte: yesterdayEnd } });
        const yesterdayAttended = await Attendance.countDocuments({ date: { $gte: yesterdayStart, $lte: yesterdayEnd } });

        const missedPlates = Math.max(0, yesterdayBooked - yesterdayAttended);
        if (missedPlates > 10) {
            dynamicAlerts.push(`High missed meals yesterday (${missedPlates} unserved)`);
        }

        if (dynamicAlerts.length === 0) {
            dynamicAlerts.push('All systems nominal');
        }

        res.json({
            success: true,
            message: 'Dashboard stats retrieved',
            data: {
                totalHostels: activeHostels ?? 0,
                totalStudents: totalStudents ?? 0,
                todaysMeals: todaysMeals ?? 0,
                alerts: dynamicAlerts ?? []
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/admin/hostels
// @desc    Create a hostel with optional owner assignment
// @access  Private (Admin)
router.post('/hostels', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { name, location, totalRooms, ownerId } = req.body;

        if (!name || !location) {
            return res.status(400).json({ msg: 'Name and Location are required' });
        }

        const newHostel = new Hostel({
            name,
            location,
            totalRooms,
            ownerId: null // Initial null, set below if valid
        });

        // Handle Initial Owner Assignment
        if (ownerId && ownerId !== 'unassigned') {
            const owner = await User.findById(ownerId);
            if (!owner || owner.role !== 'owner') {
                return res.status(400).json({ msg: 'Invalid Owner selected' });
            }

            // Check if Owner is already assigned (Steal Logic)
            if (owner.hostelId) {
                await Hostel.findByIdAndUpdate(owner.hostelId, { ownerId: null });
            }

            newHostel.ownerId = owner._id;
            owner.hostelId = newHostel._id;
            await owner.save();
        }

        await newHostel.save();

        res.json(newHostel);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/hostels/:id
// @desc    Get single hostel
// @access  Private (Admin)
router.get('/hostels/:id', auth, checkRole(['admin']), async (req, res) => {
    try {
        const hostel = await Hostel.findById(req.params.id).populate('ownerId', 'name email');
        if (!hostel) return res.status(404).json({ msg: 'Hostel not found' });
        res.json(hostel);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/admin/hostels/:id
// @desc    Delete a hostel
// @access  Private (Admin)
router.delete('/hostels/:id', auth, checkRole(['admin']), async (req, res) => {
    try {
        const hostel = await Hostel.findById(req.params.id);
        if (!hostel) return res.status(404).json({ msg: 'Hostel not found' });

        // Unassign from Owner if exists
        if (hostel.ownerId) {
            await User.findByIdAndUpdate(hostel.ownerId, { hostelId: null });
        }

        await Hostel.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Hostel deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/admin/hostels/:id
// @desc    Update a hostel details with atomic owner assignment
// @access  Private (Admin)
router.put('/hostels/:id', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { name, location, totalRooms, ownerId } = req.body;
        const hostel = await Hostel.findById(req.params.id);

        if (!hostel) {
            return res.status(404).json({ msg: 'Hostel not found' });
        }

        // 1. Update Basic Fields
        if (name) hostel.name = name;
        if (location) hostel.location = location;
        if (totalRooms !== undefined) {
            const currentOccupancy = await User.countDocuments({ role: 'student', hostelId: hostel._id });
            if (totalRooms < currentOccupancy) {
                return res.status(400).json({ msg: `Cannot reduce capacity below current occupancy (${currentOccupancy})` });
            }
            hostel.totalRooms = totalRooms;
        }

        // 2. Handle Owner Assignment
        if (ownerId !== undefined) { // Check if field is present in request
            const newOwnerId = ownerId === 'unassigned' || ownerId === '' ? null : ownerId;
            const oldOwnerId = hostel.ownerId;

            // Only proceed if there is a change
            if (String(newOwnerId) !== String(oldOwnerId)) {

                // A. Unassign Old Owner (if any)
                if (oldOwnerId) {
                    await User.findByIdAndUpdate(oldOwnerId, { hostelId: null });
                }

                // B. Assign New Owner (if any)
                if (newOwnerId) {
                    const newOwner = await User.findById(newOwnerId);
                    if (!newOwner || newOwner.role !== 'owner') {
                        return res.status(400).json({ msg: 'Invalid Owner selected' });
                    }

                    // Check if New Owner is already assigned to ANOTHER hostel
                    // If so, we must clear that other hostel's link (Steal Owner)
                    if (newOwner.hostelId && String(newOwner.hostelId) !== String(hostel._id)) {
                        await Hostel.findByIdAndUpdate(newOwner.hostelId, { ownerId: null });
                    }

                    // Link New Owner to This Hostel
                    newOwner.hostelId = hostel._id;
                    await newOwner.save();
                }

                hostel.ownerId = newOwnerId;
            } else {
                // No change
            }
        }

        await hostel.save();

        res.json(hostel);
    } catch (err) {
        console.error("Hostel Update Error:", err); // Log full error
        res.status(500).send('Server Error');
    }
});

// @route   PATCH api/admin/hostels/:id/assign-owner
// @desc    Safely assign or unassign an owner
// @access  Private (Admin)
router.patch('/hostels/:id/assign-owner', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { owner_id } = req.body;
        const hostel = await Hostel.findById(req.params.id);

        if (!hostel) {
            return res.status(404).json({ success: false, message: 'Hostel not found' });
        }

        // Case 1: Unassign Owner
        if (owner_id === null) {
            hostel.ownerId = null;
            await hostel.save();
            return res.json({ success: true, message: 'Owner unassigned successfully', data: hostel });
        }

        // Case 2: Assign Owner
        // Validate Owner Exists and is actually an owner
        const owner = await User.findById(owner_id);
        if (!owner || owner.role !== 'owner') {
            return res.status(400).json({ success: false, message: 'Invalid Owner ID or User is not an Owner' });
        }

        // Check if Owner is already assigned to ANY other hostel
        // logic: count hostels where ownerId = owner_id AND _id != currentHostel._id
        const existingAssignment = await Hostel.findOne({ ownerId: owner_id, _id: { $ne: hostel._id } });
        if (existingAssignment) {
            return res.status(400).json({
                success: false,
                message: `Owner is already assigned to another hostel: ${existingAssignment.name}`
            });
        }

        // Assign
        hostel.ownerId = owner_id;
        await hostel.save();

        res.json({ success: true, message: 'Owner assigned successfully', data: hostel });

    } catch (err) {
        console.error("Assign Owner Error:", err);
        // Handle Duplicate Key Error specifically
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'This owner is already assigned to a hostel (Database Constraint)'
            });
        }
        res.status(500).json({ success: false, message: 'Server Error during assignment' });
    }
});

// @route   GET api/admin/hostels
// @desc    Get all hostels
// @access  Private (Admin)
router.get('/hostels', auth, checkRole(['admin']), async (req, res) => {
    try {
        const hostels = await Hostel.find().populate('ownerId', 'name email').lean();

        // Add dynamic occupancy count with DEBUG LOGS
        const updatedHostels = await Promise.all(hostels.map(async (hostel) => {
            const occupied = await User.countDocuments({ role: 'student', hostelId: hostel._id });
            console.log(`Hostel: ${hostel.name} (${hostel._id}), Occupied: ${occupied}`); // Debug Log
            return { ...hostel, occupied };
        }));

        res.json(updatedHostels);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/owners
// @desc    Get all mess owners
// @access  Private (Admin)
router.get('/owners', auth, checkRole(['admin']), async (req, res) => {
    try {
        const owners = await User.find({ role: 'owner' })
            .select('-password')
            .populate('hostelId', 'name')
            .lean();

        res.json(owners);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/owners/:id
// @desc    Get single owner
// @access  Private (Admin)
router.get('/owners/:id', auth, checkRole(['admin']), async (req, res) => {
    try {
        const owner = await User.findById(req.params.id).lean();
        if (!owner) return res.status(404).json({ msg: 'Owner not found' });

        // Fetch assigned hostel
        const hostel = await Hostel.findOne({ ownerId: owner._id }).select('name').lean();

        res.json({
            ...owner,
            assignedHostel: hostel ? hostel : null
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/admin/owners/:id
// @desc    Delete an owner
// @access  Private (Admin)
router.delete('/owners/:id', auth, checkRole(['admin']), async (req, res) => {
    try {
        const student = await User.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ msg: 'Student not found' });
        }
        await User.findByIdAndDelete(req.params.id);
        // Also Unassign from Hostel
        const hostel = await Hostel.findOne({ ownerId: req.params.id });
        if (hostel) {
            hostel.ownerId = null;
            await hostel.save();
        }
        res.json({ msg: 'Owner removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/admin/owners/:id
// @desc    Update owner details with atomic hostel assignment
// @access  Private (Admin)
router.put('/owners/:id', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { name, email, hostelId } = req.body; // hostelId can be passed to assign
        const owner = await User.findById(req.params.id);

        if (!owner) {
            return res.status(404).json({ msg: 'Owner not found' });
        }

        // 1. Update Basic Fields
        if (name) owner.name = name;
        if (email) owner.email = email;

        // 2. Handle Hostel Assignment
        if (hostelId !== undefined) {
            const newHostelId = hostelId === 'unassigned' || hostelId === '' ? null : hostelId;
            const oldHostelId = owner.hostelId;

            if (String(newHostelId) !== String(oldHostelId)) {

                // A. Unassign Old Hostel (if any)
                if (oldHostelId) {
                    await Hostel.findByIdAndUpdate(oldHostelId, { ownerId: null });
                }

                // B. Assign New Hostel (if any)
                if (newHostelId) {
                    const newHostel = await Hostel.findById(newHostelId);
                    if (!newHostel) {
                        return res.status(400).json({ msg: 'Invalid Hostel selected' });
                    }

                    // Check if New Hostel already has an Owner
                    // If so, clear that other owner's link (Steal Hostel)
                    if (newHostel.ownerId && String(newHostel.ownerId) !== String(owner._id)) {
                        await User.findByIdAndUpdate(newHostel.ownerId, { hostelId: null });
                    }

                    // Link New Hostel to This Owner
                    newHostel.ownerId = owner._id;
                    await newHostel.save();
                }

                owner.hostelId = newHostelId;
            }
        }

        await owner.save();

        res.json(owner);
    } catch (err) {
        console.error("Owner Update Error:", err);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/admin/owners
// @desc    Create a new mess owner (No hostel assignment here)
// @access  Private (Admin)
router.post('/owners', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ msg: 'Please enter all fields' });
        }

        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const newUser = new User({
            name,
            email,
            password,
            role: 'owner'
        });

        const salt = await bcrypt.genSalt(10);
        newUser.password = await bcrypt.hash(password, salt);
        await newUser.save();

        res.json(newUser);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/students
// @desc    Get all students
// @access  Private (Admin)
router.get('/students', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { hostelId } = req.query;
        const query = { role: 'student' };

        if (hostelId && hostelId !== 'all') {
            query.hostelId = hostelId;
        }

        const students = await User.find(query).populate('hostelId', 'name').lean();
        res.json(students);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }

});

// @route   GET api/admin/students/:id
// @desc    Get single student
// @access  Private (Admin)
router.get('/students/:id', auth, checkRole(['admin']), async (req, res) => {
    try {
        const student = await User.findById(req.params.id).populate('hostelId', 'name').lean();
        if (!student) return res.status(404).json({ msg: 'Student not found' });
        res.json(student);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/admin/students/:id
// @desc    Delete a student
// @access  Private (Admin)
router.delete('/students/:id', auth, checkRole(['admin']), async (req, res) => {
    try {
        const student = await User.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ msg: 'Student not found' });
        }
        await User.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Student removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PATCH api/admin/students/:id/status
// @desc    Update student status (Active/Inactive)
// @access  Private (Admin)
router.patch('/students/:id/status', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ msg: 'Invalid status' });
        }

        const student = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { status } },
            { new: true }
        ).select('-password');

        if (!student) return res.status(404).json({ msg: 'Student not found' });

        // Audit
        await AuditLog.create({
            action: 'ADMIN_STATUS_UPDATE',
            performedBy: req.user.id,
            details: { student: student.name, newStatus: status }
        });

        res.json(student);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/admin/students
// @desc    Create a new student
// @access  Private (Admin)
router.post('/students', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { name, email, password, studentId, hostelId } = req.body;

        // Basic Validation
        if (!name || !email || !password || !studentId || !hostelId) {
            return res.status(400).json({ msg: 'Please enter all fields' });
        }

        // Check for duplicate email
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User with this email already exists' });
        }

        // Check for duplicate studentId
        user = await User.findOne({ studentId });
        if (user) {
            // Check if it's actually a student
            if (user.role === 'student') {
                return res.status(400).json({ msg: 'Student ID already exists' });
            }
        }

        // Check if Hostel exists
        const hostel = await Hostel.findById(hostelId);
        if (!hostel) {
            return res.status(400).json({ msg: 'Invalid Hostel ID' });
        }

        // Check for Hostel Capacity
        const currentOccupancy = await User.countDocuments({ role: 'student', hostelId: hostel._id });
        if (hostel.totalRooms && currentOccupancy >= hostel.totalRooms) {
            return res.status(400).json({ msg: 'Hostel capacity full. Cannot assign more students.' });
        }

        const newUser = new User({
            name,
            email,
            password,
            role: 'student',
            studentId,
            hostelId,
            isFirstLogin: true
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        newUser.password = await bcrypt.hash(password, salt);

        await newUser.save();

        res.json(newUser);

    } catch (err) {
        console.error('Create Student Error:', err.message);
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'Duplicate Field Error (Email or ID)' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   POST api/admin/pilot-reports
// @desc    Submit a pilot report
// @access  Private (Admin)
router.post('/pilot-reports', auth, checkRole(['admin']), async (req, res) => {
    try {
        const report = new PilotReport({
            ...req.body,
            adminId: req.user.id
        });
        await report.save();
        res.json(report);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/pilot-reports
// @desc    Get all pilot reports
// @access  Private (Admin)
router.get('/pilot-reports', auth, checkRole(['admin']), async (req, res) => {
    try {
        const reports = await PilotReport.find().populate('hostelId', 'name');
        res.json(reports);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/analytics
// @desc    Get analytics data for charts
// @access  Private (Admin)
router.get('/analytics', auth, checkRole(['admin']), async (req, res) => {
    try {
        const now = new Date();
        const endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));

        const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
        startDate.setUTCDate(startDate.getUTCDate() - 6); // Last 7 days

        // 1. Overview & Meal Counts (From MealBooking)
        const overviewPipeline = [
            {
                $match: {
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        dateStr: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        mealType: "$mealType"
                    },
                    count: { $sum: 1 }
                }
            }
        ];

        const rawConsumption = await MealBooking.aggregate(overviewPipeline);

        // Process Overview to ensure all 7 days exist
        const overviewData = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
            d.setUTCDate(d.getUTCDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = days[d.getUTCDay()];

            const breakfastCount = rawConsumption.find(c => c?._id?.dateStr === dateStr && c?._id?.mealType === 'breakfast')?.count ?? 0;
            const lunchCount = rawConsumption.find(c => c?._id?.dateStr === dateStr && c?._id?.mealType === 'lunch')?.count ?? 0;
            const dinnerCount = rawConsumption.find(c => c?._id?.dateStr === dateStr && c?._id?.mealType === 'dinner')?.count ?? 0;

            overviewData.push({
                name: dayName ?? '',
                date: dateStr ?? '',
                total: breakfastCount + lunchCount + dinnerCount,
                breakfast: breakfastCount,
                lunch: lunchCount,
                dinner: dinnerCount
            });
        }

        // 2. Dish-wise Analytics (Granular)
        const topItemsPipeline = [
            {
                $match: {
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

        const topFoodRaw = await MealBooking.aggregate(topItemsPipeline);
        const topFood = topFoodRaw.map(item => ({
            name: item?._id ?? 'Unknown',
            count: item?.count ?? 0
        }));

        // 3. Revenue Calculation using FoodItem prices
        const revenuePipeline = [
            {
                $match: {
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            { $unwind: "$items" },
            {
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

        const revenueByDate = {};
        rawRevenue.forEach(r => {
            revenueByDate[r._id] = r.totalRevenue;
        });

        const revenueData = overviewData.map(day => ({
            name: day?.name ?? '',
            total: revenueByDate[day?.date] ?? 0
        }));

        // 4. Wastage (Estimated: Booked - Attended, per day for the chart)
        const attendancePipeline = [
            {
                $match: {
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

        const wastageTrend = overviewData.map(day => {
            const booked = day?.total ?? 0;
            const attended = attendanceByDate[day?.date] ?? 0;
            return {
                name: day?.name ?? '',
                wastage: Math.max(0, booked - attended),
                total: booked
            };
        });

        res.json({
            success: true,
            message: 'Analytics generated',
            data: {
                mealDemand: overviewData ?? [],
                wastageTrend: wastageTrend ?? [],
                revenueTrend: revenueData ?? [],
                topItems: topFood ?? []
            }
        });

    } catch (err) {
        console.error("Admin Analytics Pipeline Error:", err);
        res.status(500).json({ error: 'Server Error in Analytics', details: err.message });
    }
});

// @route   GET api/admin/audit-logs
// @desc    Get system audit logs with Pagination, Filtering, Search
// @access  Private (Admin)
router.get('/audit-logs', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { page = 1, limit = 20, search, action, role, startDate, endDate } = req.query;

        const query = {};

        // Search (Text or Regex)
        if (search) {
            query.$text = { $search: search };
        }

        // Filters
        if (action) query.action = action;
        if (startDate && endDate) {
            query.timestamp = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        // Role Filtering (Complex because performedBy is a reference)
        // We can't easily filter by role in the main query without aggregation or pre-fetching users.
        // For efficiency, let's first fetch matching User IDs if role is specified.
        if (role) {
            const users = await User.find({ role }).select('_id');
            query.performedBy = { $in: users.map(u => u._id) };
        }

        const logs = await AuditLog.find(query)
            .populate('performedBy', 'name email role')
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        const total = await AuditLog.countDocuments(query);

        res.json({
            logs,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            totalLogs: total
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/audit-logs/export
// @desc    Export Audit Logs to CSV
// @access  Private (Admin)
router.get('/audit-logs/export', auth, checkRole(['admin']), async (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');

        // CSV Header
        res.write('Timestamp,Action,Performed By,Email,Role,IP Address,Details\n');

        const cursor = AuditLog.find().sort({ timestamp: -1 }).populate('performedBy', 'name email role').cursor();

        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            const user = doc.performedBy || { name: 'Unknown', email: 'N/A', role: 'N/A' };
            const details = JSON.stringify(doc.details || {}).replace(/"/g, '""'); // Escape quotes
            const row = `"${doc.timestamp.toISOString()}","${doc.action}","${user.name}","${user.email}","${user.role}","${doc.ipAddress || ''}","${details}"\n`;
            res.write(row);
        }

        res.end();
    } catch (err) {
        console.error('Export Error:', err);
        res.status(500).end();
    }
});

// @route   GET api/admin/menu/weekly
// @desc    Get weekly menu for a hostel
// @access  Private (Admin)
router.get('/menu/weekly', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { hostelId } = req.query;

        // If no hostelId provided, try to find the first one
        let targetHostelId = hostelId;
        if (!targetHostelId) {
            const firstHostel = await Hostel.findOne();
            if (!firstHostel) {
                return res.json({ hostels: [], menu: {} });
            }
            targetHostelId = firstHostel._id;
        }

        // Calculate week range (ensure we cover the full week of the client's "Today" or next 7 days)
        // For simplicity, let's get Today -> +6 days
        // Transform into structured object:
        // { "YYYY-MM-DD": { breakfast: [], lunch: [], dinner: [...] } }
        const structuredMenu = {};

        // RE-DOING DATE LOGIC TO BE ROBUST
        const today = new Date();
        const startOfCycle = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));

        // Find Menus for next 7 days
        const endOfCycle = new Date(startOfCycle);
        endOfCycle.setDate(endOfCycle.getDate() + 7);

        const menus = await Menu.find({
            hostelId: targetHostelId,
            date: { $gte: startOfCycle, $lt: endOfCycle }
        }).sort({ date: 1, mealType: 1 });

        // Init Map
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfCycle);
            d.setUTCDate(d.getUTCDate() + i);
            const dateStr = d.toISOString().split('T')[0]; // Safe because d is UTC 00:00
            structuredMenu[dateStr] = { date: d, breakfast: [], lunch: [], dinner: [] };
        }

        menus.forEach(menu => {
            // Strict UTC String
            const d = new Date(menu.date);
            const dateKey = d.toISOString().split('T')[0];

            if (structuredMenu[dateKey]) {
                const type = menu.mealType.toLowerCase();
                // Combine veg and non-veg items for display, maybe add a flag
                const items = [
                    ...menu.vegItems.map(i => ({ ...i.toObject(), type: 'veg' })),
                    ...menu.nonVegItems.map(i => ({ ...i.toObject(), type: 'non-veg' }))
                ];
                if (structuredMenu[dateKey][type]) {
                    structuredMenu[dateKey][type] = items;
                    // Pass status
                    structuredMenu[dateKey][`${type}Status`] = menu.status || 'PUBLISHED';
                }
            }
        });

        res.json({
            hostelId: targetHostelId,
            menu: structuredMenu
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/settings
// @desc    Get system settings
// @access  Private (Admin)
router.get('/settings', auth, checkRole(['admin']), async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/admin/settings
// @desc    Update system settings
// @access  Private (Admin)
router.put('/settings', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { academicSession, mealBookingCutoffHours, mealCutoffTimes } = req.body;

        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
        }

        if (academicSession) settings.academicSession = academicSession;
        if (mealBookingCutoffHours !== undefined) settings.mealBookingCutoffHours = mealBookingCutoffHours;
        if (mealCutoffTimes) settings.mealCutoffTimes = mealCutoffTimes;
        settings.updatedAt = Date.now();

        await settings.save();
        res.json(settings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
