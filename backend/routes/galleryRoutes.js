// Gallery CRUD routes.
const express = require('express');
const { body } = require('express-validator');
const {
    getGallery,
    getGalleryAdmin,
    createGalleryItem,
    deleteGalleryItem
} = require('../controllers/galleryController');
const { protect } = require('../middleware/authMiddleware');
const { createUploader } = require('../middleware/uploadMiddleware');

const router = express.Router();
const upload = createUploader('gallery');
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get('/', asyncHandler(getGallery));
router.get('/admin', protect, asyncHandler(getGalleryAdmin));
router.post(
    '/',
    protect,
    upload.single('image'),
    [body('title').optional().trim().isLength({ max: 120 })],
    asyncHandler(createGalleryItem)
);
router.delete('/:id', protect, asyncHandler(deleteGalleryItem));

module.exports = router;
