// Authentication routes for admin access.
const express = require('express');
const { body } = require('express-validator');
const { loginAdmin, getProfile, changePassword, logoutAdmin } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.post(
    '/login',
    [
        body('username').trim().notEmpty().withMessage('Username is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    asyncHandler(loginAdmin)
);

router.get('/me', protect, asyncHandler(getProfile));
router.post('/logout', asyncHandler(logoutAdmin));
router.put(
    '/password',
    protect,
    [
        body('currentPassword').notEmpty().withMessage('Current password is required'),
        body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    ],
    asyncHandler(changePassword)
);

module.exports = router;
