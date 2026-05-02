// Faculty CRUD routes.
const express = require('express');
const { body } = require('express-validator');
const {
    getFaculty,
    getFacultyAdmin,
    createFaculty,
    updateFaculty,
    deleteFaculty
} = require('../controllers/facultyController');
const { protect } = require('../middleware/authMiddleware');
const { createUploader } = require('../middleware/uploadMiddleware');

const router = express.Router();
const upload = createUploader('faculty');
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get('/', asyncHandler(getFaculty));
router.get('/admin', protect, asyncHandler(getFacultyAdmin));
router.post(
    '/',
    protect,
    upload.single('photo'),
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('subject').trim().notEmpty().withMessage('Subject is required')
    ],
    asyncHandler(createFaculty)
);
router.put('/:id', protect, upload.single('photo'), asyncHandler(updateFaculty));
router.delete('/:id', protect, asyncHandler(deleteFaculty));

module.exports = router;
