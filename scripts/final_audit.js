const { MongoClient, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hostel_mess_db';

async function runFinalAudit() {
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB (Native Driver)');

        const db = client.db();
        const feedbackColl = db.collection('feedbacks');
        const hostelColl = db.collection('hostels');

        // 🎯 STEP 1: DATABASE INDEX VERIFICATION
        console.log('\n🔍 -- 1. DATABASE INDEX CHECK --');
        let indexes = await feedbackColl.indexes();
        let feedbackIndex = indexes.find(idx => idx.key && idx.key.hostelId === 1 && idx.key.rating === 1);

        if (feedbackIndex) {
            console.log('✅ Index { hostelId: 1, rating: 1 } exists.');
        } else {
            console.warn('⚠️ Index { hostelId: 1, rating: 1 } MISSING. Attempting to create...');
            try {
                await feedbackColl.createIndex({ hostelId: 1, rating: 1 });
                console.log('✅ Created Index { hostelId: 1, rating: 1 } successfully.');
            } catch (createErr) {
                console.error('❌ Failed to create index:', createErr.message);
            }
        }

        // Final verify
        indexes = await feedbackColl.indexes();
        feedbackIndex = indexes.find(idx => idx.key && idx.key.hostelId === 1 && idx.key.rating === 1);
        if (feedbackIndex) console.log("✅ Final Check: Index is active.");
        else console.error("❌ Final Check: Index is STILL MISSING.");


        // 🎯 STEP 2: PERFORMANCE CHECK (Simulate large dataset)
        const mockHostelId = new ObjectId();
        console.log('\n🔍 -- 2. PERFORMANCE CHECK (1000 Mock Feedbacks) --');

        await hostelColl.insertOne({
            _id: mockHostelId,
            name: 'Performance Test Hostel',
            location: 'Load Test Area',
            totalRooms: 500
        });

        const mockFeedbacks = [];
        for (let i = 0; i < 1000; i++) {
            mockFeedbacks.push({
                hostelId: mockHostelId,
                rating: Math.floor(Math.random() * 5) + 1, // 1-5
                studentId: new ObjectId(),
                comment: "Load test comment " + i,
                createdAt: new Date()
            });
        }

        const insertStart = process.hrtime();
        await feedbackColl.insertMany(mockFeedbacks);
        const insertEnd = process.hrtime(insertStart);
        console.log(`✅ Inserted 1000 documents in ${insertEnd[0]}s ${insertEnd[1] / 1000000}ms`);

        // 🎯 STEP 3: BACKEND LOGIC & AGGREGATION SPEED
        console.log('\n🔍 -- 3. BACKEND AGGREGATION SPEED --');

        // Owner Aggregation
        const ownerStart = process.hrtime();
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
        const ownerEnd = process.hrtime(ownerStart);
        console.log(`⏱ Owner Aggregation Time: ${ownerEnd[0]}s ${ownerEnd[1] / 1000000}ms`);

        if (ownerStats.length > 0) {
            const avg = parseFloat(ownerStats[0].averageRating.toFixed(1));
            const count = ownerStats[0].totalReviews;
            console.log(`✅ Owner Result: Avg=${avg}, Count=${count} (Expected Count: 1000)`);
            if (count === 1000) console.log("✅ Owner Logic: CORRECT");
            else console.error("❌ Owner Logic: INCORRECT count");
        } else {
            console.error("❌ Owner Logic: NO RESULTS");
        }

        // Admin Aggregation
        const adminStart = process.hrtime();
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
        const adminEnd = process.hrtime(adminStart);
        console.log(`⏱ Admin Aggregation Time: ${adminEnd[0]}s ${adminEnd[1] / 1000000}ms`);

        if (adminStats.length > 0) {
            const result = adminStats[0];
            console.log(`✅ Admin Result: Avg=${result.averageRating}, Count=${result.totalReviews}`);
            if (result.totalReviews === 1000) console.log("✅ Admin Logic: CORRECT");
            else console.error("❌ Admin Logic: INCORRECT count");
        } else {
            console.error("❌ Admin Logic: NO RESULTS");
        }

        // Cleanup
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

runFinalAudit();
