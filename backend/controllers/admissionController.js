// Admission form submission and admin management.
const { validationResult } = require('express-validator');
const Admission = require('../models/Admission');
const Settings = require('../models/Settings');
const { sendAdmissionNotification, sendAdmissionsReportEmail, formatMailError, hasMailConfiguration } = require('../utils/emailService');
const { buildAdmissionsPdfBuffer } = require('../utils/admissionPdf');

const ADMISSION_STATUSES = ['New', 'Reviewed', 'Contacted', 'Closed'];

const getSelectedAdmissions = async (admissionIds = []) => {
    const uniqueIds = [...new Set(admissionIds.filter(Boolean))];

    if (!uniqueIds.length) {
        const error = new Error('Please select at least one admission.');
        error.statusCode = 400;
        throw error;
    }

    const admissions = await Admission.find({ _id: { $in: uniqueIds } }).sort({ createdAt: -1 });

    if (!admissions.length) {
        const error = new Error('Selected admissions were not found.');
        error.statusCode = 404;
        throw error;
    }

    return admissions;
};

const getSchoolProfile = async () => {
    const settings = await Settings.findOne();

    return {
        schoolName: settings?.schoolName || 'VISWASHANTHI HIGH SCHOOL',
        schoolAddress: settings?.address || settings?.location || 'Allagadda, Andhra Pradesh'
    };
};

const queueAdmissionNotification = async (admission) => {
    if (!hasMailConfiguration()) {
        console.warn(`Admission ${admission._id} saved without mail delivery because SMTP is not configured.`);
        return;
    }

    try {
        const schoolProfile = await getSchoolProfile();
        await sendAdmissionNotification(admission, schoolProfile);
        console.log(`Admission notification emails sent successfully for ${admission._id}.`);
    } catch (error) {
        console.error(`Admission notification failed for ${admission._id}:`, formatMailError(error));
    }
};

const getAdmissions = async (req, res) => {
    const admissions = await Admission.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, admissions });
};

const createAdmission = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    const admission = await Admission.create(req.body);
    queueAdmissionNotification(admission);

    res.status(201).json({
        success: true,
        message: hasMailConfiguration()
            ? 'Application submitted successfully. Confirmation email is being processed.'
            : 'Application submitted successfully. Our admissions team will review it shortly.',
        applicationId: admission._id,
        admission
    });
};

const updateAdmissionStatus = async (req, res) => {
    const admission = await Admission.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true, runValidators: true }
    );

    if (!admission) {
        return res.status(404).json({ success: false, message: 'Admission not found' });
    }

    res.status(200).json({
        success: true,
        message: 'Admission status updated successfully',
        admission
    });
};

const downloadAdmissionsPdf = async (req, res) => {
    const admissions = await getSelectedAdmissions(req.body.admissionIds);
    const { schoolName, schoolAddress } = await getSchoolProfile();
    const pdfBuffer = await buildAdmissionsPdfBuffer({
        admissions,
        schoolName,
        schoolAddress,
        title: 'Selected Admission Applications',
        subtitle: 'Prepared by the admissions admin panel'
    });

    const fileName = `admissions-report-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(200).send(pdfBuffer);
};

const emailAdmissionsPdf = async (req, res) => {
    const recipientEmail = String(req.body.recipientEmail || '').trim();

    if (!recipientEmail || !/^\S+@\S+\.\S+$/.test(recipientEmail)) {
        return res.status(422).json({
            success: false,
            message: 'A valid recipient email is required.'
        });
    }

    const admissions = await getSelectedAdmissions(req.body.admissionIds);
    const { schoolName, schoolAddress } = await getSchoolProfile();
    const pdfBuffer = await buildAdmissionsPdfBuffer({
        admissions,
        schoolName,
        schoolAddress,
        title: 'Admissions Report',
        subtitle: 'Professional report generated from the admin panel'
    });

    try {
        await sendAdmissionsReportEmail({
            recipientEmail,
            pdfBuffer,
            fileName: `admissions-report-${Date.now()}.pdf`,
            admissions,
            schoolName,
            schoolAddress
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: formatMailError(error)
        });
    }

    const reviewedIds = admissions.map((item) => item._id);
    await Admission.updateMany(
        { _id: { $in: reviewedIds }, status: { $in: ADMISSION_STATUSES } },
        { $set: { status: 'Reviewed' } }
    );

    res.status(200).json({
        success: true,
        message: `Admissions report sent successfully to ${recipientEmail}.`,
        reviewedIds: reviewedIds.map((id) => String(id))
    });
};

const deleteAdmission = async (req, res) => {
    const admission = await Admission.findById(req.params.id);

    if (!admission) {
        return res.status(404).json({ success: false, message: 'Admission not found' });
    }

    await admission.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Admission deleted successfully'
    });
};

module.exports = {
    getAdmissions,
    createAdmission,
    updateAdmissionStatus,
    downloadAdmissionsPdf,
    emailAdmissionsPdf,
    deleteAdmission
};
