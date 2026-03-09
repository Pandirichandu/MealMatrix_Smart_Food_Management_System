/* eslint-disable @typescript-eslint/no-require-imports */
const { MongoClient, ObjectId } = require('mongodb');

async function run() {
    const uri = "mongodb://127.0.0.1:27017/mealmatrix";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db("mealmatrix");

        const owner = await db.collection("users").findOne({ role: "owner" });
        if (!owner) return console.log("No owner found");

        const endDate = new Date("2026-02-23T23:59:59.999Z");
        const startDate = new Date("2026-02-15T00:00:00.000Z");

        const revenuePipeline = [
            {
                $match: {
                    hostelId: owner.hostelId,
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

        const rawRevenue = await db.collection("mealbookings").aggregate(revenuePipeline).toArray();
        console.log("Raw Revenue Aggregation Output:");
        console.log(JSON.stringify(rawRevenue, null, 2));

    } finally {
        await client.close();
    }
}
run().catch(console.dir);
