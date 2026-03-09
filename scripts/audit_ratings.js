const { MongoClient, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hostel_mess_db';

async function runAudit() {
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB (Native Driver)');

        const db = client.db();
        const feedbackColl = db.collection('feedbacks');
        const hostelColl = db.collection('hostels');

        // 1. Check Index
        console.log('\n🔍 -- DATABASE INDEX CHECK --');
        const indexes = await feedbackColl.indexes();
        const feedbackIndex = indexes.find(idx => idx.key && idx.key.hostelId === 1 && idx.key.rating === 1);

        if (feedbackIndex) {
            console.log('✅ Index { hostelId: 1, rating: 1 } exists.');
        } else {
            console.warn('⚠️ Index { hostelId: 1, rating: 1 } NOT FOUND. Found:', indexes.map(i => i.key));
        }

        // 2. Mock Data Setup (Ensure cleanup first)
        const mockHostelId = new ObjectId();

        console.log('\n🛠 -- SETUP MOCK DATA --');

        await hostelColl.insertOne({
            _id: mockHostelId,
            name: 'Audit Hostel',
            location: 'Test Location',
            totalRooms: 100
        });

        await feedbackColl.insertMany([
            { hostelId: mockHostelId, rating: 5, studentId: new ObjectId() },
            { hostelId: mockHostelId, rating: 4, studentId: new ObjectId() },
            { hostelId: mockHostelId, rating: 5, studentId: new ObjectId() }
        ]);

        console.log('✅ Created mock hostel and 3 feedbacks (5, 4, 5)');

        // 3. Verify Owner Aggregation Logic
        console.log('\n🔍 -- OWNER AGGREGATION CHECK --');
        const ownerStats = await feedbackColl.aggregate([
            { $match: { hostelId: mockHostelId } },
            {
                $group: {
                    _id: "$hostelId",
                    averageRating: { $avg: "$rating" },
                    totalReviews: { $sum: 1 }
                }
            }
        ]).toArray();

        if (ownerStats.length > 0) {
            const avg = parseFloat(ownerStats[0].averageRating.toFixed(1));
            const count = ownerStats[0].totalReviews;

            console.log(`Expected Avg: 4.7 (approx), Got: ${avg}`);
            console.log(`Expected Count: 3, Got: ${count}`);

            if (avg === 4.7 && count === 3) {
                console.log('✅ Owner Aggregation Logic Correct');
            } else {
                console.error('❌ Owner Aggregation Logic INCORRECT');
            }
        } else {
            console.error('❌ No aggregated stats found');
        }

        // 4. Verify Admin Aggregation Logic
        console.log('\n🔍 -- ADMIN AGGREGATION CHECK --');
        const adminStats = await feedbackColl.aggregate([
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
            { $unwind: "$hostel" },
            {
                $project: {
                    hostelId: "$_id",
                    averageRating: { $round: ["$averageRating", 1] },
                    totalReviews: 1,
                    _id: 0
                }
            },
            { $match: { hostelId: mockHostelId } }
        ]).toArray();

        if (adminStats.length > 0) {
            const result = adminStats[0];
            console.log(`Expected Avg: 4.7, Got: ${result.averageRating}`);

            if (result.averageRating === 4.7 && result.totalReviews === 3) {
                console.log('✅ Admin Aggregation Logic Correct');
            } else {
                console.error('❌ Admin Aggregation Logic INCORRECT');
            }
        } else {
            console.error('❌ Admin Aggregation returned nothing for mock hostel');
        }

        // 5. Cleanup
        console.log('\n🧹 -- CLEANUP --');
        await hostelColl.deleteOne({ _id: mockHostelId });
        await feedbackColl.deleteMany({ hostelId: mockHostelId });
        console.log('✅ Mock data removed');

    } catch (err) {
        console.error('❌ Audit Failed:', err);
    } finally {
        await client.close();
        console.log('✅ Disconnected');
    }
}

runAudit();
