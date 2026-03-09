const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    // Get token from cookie OR header
    // The requirement is "HTTP-only cookies preferred"
    let token = req.cookies.token || req.header('x-auth-token');

    // Check if not token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

const checkRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ msg: 'Access denied: Insufficient permissions' });
        }
        next();
    };
};

module.exports = { auth, checkRole };
