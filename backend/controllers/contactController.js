const { validationResult } = require('express-validator');
const Settings = require('../models/Settings');
const { sendContactNotification, formatMailError } = require('../utils/emailService');

const createContactMessage = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    const settings = await Settings.findOne();
    const schoolName = settings?.schoolName || 'VISWASHANTHI HIGH SCHOOL';
    const schoolAddress = settings?.address || settings?.location || 'Allagadda, Andhra Pradesh';

    try {
        await sendContactNotification({
            contact: req.body,
            schoolName,
            schoolAddress
        });

        return res.status(201).json({
            success: true,
            message: 'Message sent successfully. Our team will contact you soon.'
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: formatMailError(error)
        });
    }
};

module.exports = {
    createContactMessage
};
