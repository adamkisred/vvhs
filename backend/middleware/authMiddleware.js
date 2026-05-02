// JWT route protection middleware for admin-only APIs.
const Admin = require('../models/Admin');
const { extractTokenFromRequest, verifyAdminToken } = require('../utils/authSecurity');

const protect = async (req, res, next) => {
    try {
        const token = extractTokenFromRequest(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized. Token missing.'
            });
        }

        const decoded = verifyAdminToken(token);
        const admin = await Admin.findById(decoded.id).select('-password');

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Admin not found.'
            });
        }

        if ((decoded.sessionVersion || 0) !== (admin.sessionVersion || 0)) {
            return res.status(401).json({
                success: false,
                message: 'Session expired. Please sign in again.'
            });
        }

        req.admin = admin;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized. Token invalid.'
        });
    }
};

module.exports = { protect };
