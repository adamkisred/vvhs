// Site settings and dashboard statistics routes.
const express = require('express');
const { getPublicSettings, getAdminSettings, updateSettings, getDashboardStats } = require('../controllers/settingsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get('/', asyncHandler(getPublicSettings));
router.get('/admin', protect, asyncHandler(getAdminSettings));
router.get('/stats', protect, asyncHandler(getDashboardStats));
router.put('/', protect, asyncHandler(updateSettings));

module.exports = router;
