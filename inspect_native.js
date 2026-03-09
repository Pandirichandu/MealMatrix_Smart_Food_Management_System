/* eslint-disable @typescript-eslint/no-require-imports */
const { MongoClient } = require('mongodb');

async function run() {
    const uri = "mongodb://127.0.0.1:27017/mealmatrix";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected successfully to native MongoDB");
        const db = client.db("mealmatrix");

        // Get an owner
        const owner = await db.collection("users").findOne({ role: "owner" });
        if (!owner) return console.log("No owner found");
        console.log("Owner Hostel ID:", owner.hostelId);

        // Count all bookings
        const totalBookings = await db.collection("mealbookings").countDocuments();
        console.log("Total Bookings in DB:", totalBookings);

        // Count for this owner
        if (owner.hostelId) {
            const ownerBookingsCount = await db.collection("mealbookings").countDocuments({ hostelId: owner.hostelId });
            console.log("Owner Bookings Count:", ownerBookingsCount);

            if (ownerBookingsCount > 0) {
                const sample = await db.collection("mealbookings").findOne({ hostelId: owner.hostelId });
                console.log("Sample Booking:", JSON.stringify(sample, null, 2));

                // Check food item
                if (sample.items && sample.items.length > 0) {
                    const itemName = sample.items[0].itemName;
                    const foodMatch = await db.collection("fooditems").findOne({ foodName: itemName });
                    console.log("Looking up Food Item:", itemName);
                    console.log("Food Match Price:", foodMatch ? foodMatch.price : "NOT FOUND");
                }
            }
        }

    } finally {
        await client.close();
    }
}
run().catch(console.dir);
