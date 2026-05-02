// Admin authentication and profile management.
const { validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const { clearAuthCookie, setAuthCookie, signAdminToken } = require('../utils/authSecurity');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

const sanitizeAdmin = (admin) => ({
    id: admin._id,
    username: admin.username,
    name: admin.name,
    role: admin.role,
    lastLoginAt: admin.lastLoginAt
});

const loginAdmin = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });

    if (admin?.lockUntil && admin.lockUntil > new Date()) {
        return res.status(423).json({
            success: false,
            message: 'Account temporarily locked after multiple failed login attempts. Please try again later.'
        });
    }

    if (!admin || !(await admin.comparePassword(password))) {
        if (admin) {
            admin.loginAttempts = (admin.loginAttempts || 0) + 1;

            if (admin.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
                admin.lockUntil = new Date(Date.now() + LOCKOUT_WINDOW_MS);
                admin.loginAttempts = 0;
            }

            await admin.save();
        }

        return res.status(401).json({
            success: false,
            message: 'Invalid username or password'
        });
    }

    admin.loginAttempts = 0;
    admin.lockUntil = null;
    admin.lastLoginAt = new Date();
    await admin.save();

    const token = signAdminToken(admin);
    setAuthCookie(res, req, token);

    return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        admin: sanitizeAdmin(admin)
    });
};

const getProfile = async (req, res) => {
    return res.status(200).json({
        success: true,
        admin: sanitizeAdmin(req.admin)
    });
};

const changePassword = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin._id);

    if (!admin || !(await admin.comparePassword(currentPassword))) {
        return res.status(400).json({
            success: false,
            message: 'Current password is incorrect'
        });
    }

    admin.password = newPassword;
    admin.passwordChangedAt = new Date();
    admin.sessionVersion = (admin.sessionVersion || 0) + 1;
    await admin.save();

    const token = signAdminToken(admin);
    setAuthCookie(res, req, token);

    return res.status(200).json({
        success: true,
        message: 'Password updated successfully',
        token,
        admin: sanitizeAdmin(admin)
    });
};

const logoutAdmin = async (req, res) => {
    clearAuthCookie(res, req);

    return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
};

module.exports = {
    loginAdmin,
    getProfile,
    changePassword,
    logoutAdmin
};
