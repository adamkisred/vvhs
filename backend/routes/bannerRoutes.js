// Banner CRUD routes.
const express = require('express');
const { body } = require('express-validator');
const {
    getBanners,
    getAllBanners,
    getPopupBanner,
    getPopupBannerAdmin,
    deletePopupBanner,
    getBanner,
    createBanner,
    upsertPopupBanner,
    updateBanner,
    deleteBanner,
    toggleBannerStatus
} = require('../controllers/bannerController');
const { protect } = require('../middleware/authMiddleware');
const { createUploader } = require('../middleware/uploadMiddleware');

const router = express.Router();
const upload = createUploader('banners');
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get('/', asyncHandler(getBanners));
router.get('/popup', asyncHandler(getPopupBanner));
router.get('/admin', protect, asyncHandler(getAllBanners));
router.get('/popup/admin', protect, asyncHandler(getPopupBannerAdmin));
router.delete('/popup/admin', protect, asyncHandler(deletePopupBanner));
router.get('/:id', asyncHandler(getBanner));
router.post(
    '/',
    protect,
    upload.single('image'),
    [body('title').optional().trim().isLength({ max: 120 })],
    asyncHandler(createBanner)
);
router.put('/popup/admin', protect, upload.single('image'), asyncHandler(upsertPopupBanner));
router.put('/:id', protect, upload.single('image'), asyncHandler(updateBanner));
router.delete('/:id', protect, asyncHandler(deleteBanner));
router.patch('/:id/toggle', protect, asyncHandler(toggleBannerStatus));

module.exports = router;
