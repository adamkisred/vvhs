const { validationResult } = require('express-validator');
const Settings = require('../models/Settings');
const { sendContactNotification, formatMailError, hasMailConfiguration } = require('../utils/emailService');

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

    if (hasMailConfiguration()) {
        sendContactNotification({
            contact: req.body,
            schoolName,
            schoolAddress
        })
            .then(() => {
                console.log(`Contact confirmation emails sent successfully for ${req.body.email}.`);
            })
            .catch((error) => {
                console.error(`Contact notification failed for ${req.body.email}:`, formatMailError(error));
            });
    } else {
        console.warn(`Contact message from ${req.body.email} saved without mail delivery because SMTP is not configured.`);
    }

    return res.status(201).json({
        success: true,
        message: hasMailConfiguration()
            ? 'Message sent successfully. Confirmation email is being processed.'
            : 'Message sent successfully. Our team will contact you soon.'
    });
};

module.exports = {
    createContactMessage
};
