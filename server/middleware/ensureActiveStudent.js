const User = require('../models/User');

module.exports = async function (req, res, next) {
    try {
        // 1. Get User ID from Request (Auth must run first)
        if (!req.user || !req.user.id) {
            return res.status(401).json({ msg: 'Unauthorized: No user found' });
        }

        // 2. Fetch Latest Status from DB (Critical: Do not trust token)
        const user = await User.findById(req.user.id).select('status role');

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // 3. Check Status
        if (user.role === 'student' && user.status === 'inactive') {
            return res.status(403).json({
                msg: 'Your account is inactive. Please contact your Mess Owner or Admin.'
            });
        }

        next();
    } catch (err) {
        console.error('Active Check Error:', err.message);
        res.status(500).send('Server Error');
    }
};
