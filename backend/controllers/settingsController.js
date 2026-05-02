// Dynamic site settings and dashboard analytics.
const Settings = require('../models/Settings');
const Admission = require('../models/Admission');
const Faculty = require('../models/Faculty');
const Gallery = require('../models/Gallery');
const Banner = require('../models/Banner');

const getOrCreateSettings = async () => {
    let settings = await Settings.findOne();

    if (!settings) {
        settings = await Settings.create({});
    }

    return settings;
};

const getPublicSettings = async (req, res) => {
    const settings = await getOrCreateSettings();
    const sanitizedSettings = settings.toObject();
    delete sanitizedSettings.mailHost;
    delete sanitizedSettings.mailPort;
    delete sanitizedSettings.mailSecure;
    delete sanitizedSettings.mailUser;
    delete sanitizedSettings.mailPass;
    delete sanitizedSettings.admissionReceiverEmail;
    res.status(200).json({ success: true, settings: sanitizedSettings });
};

const getAdminSettings = async (req, res) => {
    const settings = await getOrCreateSettings();
    const sanitizedSettings = settings.toObject();
    delete sanitizedSettings.mailHost;
    delete sanitizedSettings.mailPort;
    delete sanitizedSettings.mailSecure;
    delete sanitizedSettings.mailUser;
    delete sanitizedSettings.mailPass;
    delete sanitizedSettings.admissionReceiverEmail;

    res.status(200).json({ success: true, settings: sanitizedSettings });
};

const updateSettings = async (req, res) => {
    const settings = await getOrCreateSettings();
    const payload = { ...req.body };

    if (typeof payload.contactEmail === 'string') {
        payload.contactEmail = payload.contactEmail.trim();
    }

    delete payload.mailHost;
    delete payload.mailPort;
    delete payload.mailSecure;
    delete payload.mailUser;
    delete payload.mailPass;
    delete payload.admissionReceiverEmail;

    Object.assign(settings, payload);
    await settings.save();

    res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        settings
    });
};

const getDashboardStats = async (req, res) => {
    const [admissions, faculty, gallery, banners] = await Promise.all([
        Admission.countDocuments(),
        Faculty.countDocuments(),
        Gallery.countDocuments(),
        Banner.countDocuments()
    ]);

    res.status(200).json({
        success: true,
        stats: {
            admissions,
            faculty,
            gallery,
            banners
        }
    });
};

module.exports = {
    getPublicSettings,
    getAdminSettings,
    updateSettings,
    getDashboardStats
};
