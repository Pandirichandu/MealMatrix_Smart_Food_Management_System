const mongoose = require('mongoose');

const HostelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    totalRooms: {
        type: Number,
        required: true,
        min: [1, 'Capacity must be at least 1']
    },
    totalStudents: {
        type: Number,
        default: 0
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Link to the Mess Owner
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Enforce unique ownerId only when it is not null
// Enforce unique ownerId only when it is not null
// Note: $ne is not supported in partialFilterExpression, so we use $type: "objectId" to exclude nulls
HostelSchema.index(
    { ownerId: 1 },
    {
        unique: true,
        partialFilterExpression: {
            ownerId: { $type: "objectId" }
        }
    }
);

module.exports = mongoose.model('Hostel', HostelSchema);
