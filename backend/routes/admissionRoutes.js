// Admission form and dashboard management routes.
const express = require('express');
const { body } = require('express-validator');
const {
    getAdmissions,
    createAdmission,
    updateAdmissionStatus,
    downloadAdmissionsPdf,
    emailAdmissionsPdf,
    deleteAdmission
} = require('../controllers/admissionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get('/', protect, asyncHandler(getAdmissions));
router.post(
    '/',
    [
        body('studentName').trim().notEmpty().withMessage('Student name is required'),
        body('className').trim().notEmpty().withMessage('Class is required'),
        body('parentName').trim().notEmpty().withMessage('Parent name is required'),
        body('phone').trim().isLength({ min: 10 }).withMessage('Valid phone is required'),
        body('email').trim().isEmail().withMessage('Valid email is required'),
        body('address').trim().notEmpty().withMessage('Address is required')
    ],
    asyncHandler(createAdmission)
);
router.post('/selected/pdf', protect, asyncHandler(downloadAdmissionsPdf));
router.post('/selected/email', protect, asyncHandler(emailAdmissionsPdf));
router.patch(
    '/:id/status',
    protect,
    [body('status').isIn(['New', 'Reviewed', 'Contacted', 'Closed']).withMessage('Valid status is required')],
    asyncHandler(updateAdmissionStatus)
);
router.delete('/:id', protect, asyncHandler(deleteAdmission));

module.exports = router;
