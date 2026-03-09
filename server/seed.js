const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Hostel = require('./models/Hostel');
const Menu = require('./models/Menu');
const dotenv = require('dotenv');
dotenv.config();

console.log('Connecting to MongoDB...', process.env.MONGODB_URI);
mongoose.connect(process.env.MONGODB_URI || 'mongodb://0.0.0.0:27017/mealmatrix')
    .then(async () => {
        console.log('Connected. Starting full seed...');
        try {
            await User.deleteMany({});
            await Hostel.deleteMany({});
            await Menu.deleteMany({});

            // 1. Create Hostel
            console.log('Creating Hostel...');
            const hostel = new Hostel({
                name: "Boys Hostel A",
                location: "North Campus",
                totalRooms: 50,
                totalStudents: 100
            });
            await hostel.save();

            // 2. Create Users
            console.log('Creating Users...');
            const salt = await bcrypt.genSalt(10);
            const password = await bcrypt.hash('123456', salt);

            const admin = new User({
                name: "System Admin",
                email: "admin@mealmatrix.com",
                password: password,
                role: "admin"
            });

            const owner = new User({
                name: "Rajesh Owner",
                email: "owner@mealmatrix.com",
                password: password,
                role: "owner",
                hostelId: hostel._id
            });

            const student = new User({
                name: "Rahul Student",
                email: "student@mealmatrix.com",
                password: password,
                role: "student",
                hostelId: hostel._id,
                studentId: "STU101"
            });

            await admin.save();
            await owner.save();
            await student.save();

            // 3. Create Menu
            console.log('Creating Menu...');
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const commonImage = '/menu-images/placeholder.jpg';

            const breakfastMenu = new Menu({
                hostelId: hostel._id,
                date: today,
                mealType: 'breakfast',
                vegItems: [
                    { foodName: "Idli", imageUrl: commonImage, vegOrNonVeg: 'veg', price: 30 },
                    { foodName: "Sambar", imageUrl: commonImage, vegOrNonVeg: 'veg', price: 0 },
                    { foodName: "Coffee", imageUrl: commonImage, vegOrNonVeg: 'veg', price: 15 }
                ],
                nonVegItems: []
            });
            await breakfastMenu.save();

            const lunchMenu = new Menu({
                hostelId: hostel._id,
                date: today,
                mealType: 'lunch',
                vegItems: [
                    { foodName: "Rice", imageUrl: commonImage, vegOrNonVeg: 'veg', price: 0 },
                    { foodName: "Dal Tadka", imageUrl: commonImage, vegOrNonVeg: 'veg', price: 40 },
                    { foodName: "Aloo Gobi", imageUrl: commonImage, vegOrNonVeg: 'veg', price: 50 }
                ],
                nonVegItems: []
            });
            await lunchMenu.save();

            const dinnerMenu = new Menu({
                hostelId: hostel._id,
                date: today,
                mealType: 'dinner',
                vegItems: [
                    { foodName: "Chapati", imageUrl: commonImage, vegOrNonVeg: 'veg', price: 10 },
                    { foodName: "Paneer Butter Masala", imageUrl: commonImage, vegOrNonVeg: 'veg', price: 80 }
                ],
                nonVegItems: []
            });
            await dinnerMenu.save();

            console.log('FULL SEED COMPLETE.');
            console.log('Admin: admin@mealmatrix.com / 123456');
            console.log('Owner: owner@mealmatrix.com / 123456');
            console.log('Student: student@mealmatrix.com / 123456');
            process.exit(0);

        } catch (e) {
            console.error('Seed Error:', e);
            process.exit(1);
        }
    })
    .catch(err => {
        console.error('Conn Error:', err);
        process.exit(1);
    });
