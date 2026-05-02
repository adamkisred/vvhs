const express = require('express');
const { body } = require('express-validator');
const { createContactMessage } = require('../controllers/contactController');

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.post(
    '/',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').trim().isEmail().withMessage('Valid email is required'),
        body('phone').trim().isLength({ min: 10 }).withMessage('Valid phone number is required'),
        body('message').trim().notEmpty().withMessage('Message is required')
    ],
    asyncHandler(createContactMessage)
);

module.exports = router;
