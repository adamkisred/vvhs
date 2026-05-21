// Dynamic site settings and dashboard analytics.
const Settings = require('../models/Settings');
const Admission = require('../models/Admission');
const Faculty = require('../models/Faculty');
const Gallery = require('../models/Gallery');
const Banner = require('../models/Banner');

const buildMapEmbedUrl = (query = 'Allagadda Andhra Pradesh') =>
    `https://maps.google.com/maps?width=100%25&height=600&hl=en&q=${encodeURIComponent(query)}&t=&z=14&ie=UTF8&iwloc=B&output=embed`;

const extractMapQueryFromUrl = (url) => {
    const pathname = decodeURIComponent(url.pathname || '');
    const pathSegments = pathname.split('/').filter(Boolean);
    const placeIndex = pathSegments.findIndex((segment) => segment.toLowerCase() === 'place');

    if (placeIndex !== -1 && pathSegments[placeIndex + 1]) {
        return pathSegments[placeIndex + 1].replace(/\+/g, ' ');
    }

    const coordinateMatch = pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (coordinateMatch) {
        return `${coordinateMatch[1]},${coordinateMatch[2]}`;
    }

    return (
        url.searchParams.get('q') ||
        url.searchParams.get('query') ||
        url.searchParams.get('destination') ||
        url.searchParams.get('address') ||
        ''
    );
};

const resolveGoogleMapsShortLink = async (url) => {
    if (!/maps\.app\.goo\.gl$/i.test(url.hostname)) {
        return url;
    }

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            redirect: 'follow'
        });

        return new URL(response.url);
    } catch (error) {
        return url;
    }
};

const normalizeMapEmbedUrl = async (value, fallbackQuery) => {
    const url = String(value || '').trim();

    if (!url) {
        return buildMapEmbedUrl(fallbackQuery);
    }

    if (url.includes('/maps/embed') || url.includes('output=embed')) {
        return url;
    }

    try {
        const parsed = await resolveGoogleMapsShortLink(new URL(url));
        const query = extractMapQueryFromUrl(parsed);

        if (query) {
            return buildMapEmbedUrl(query);
        }
    } catch (error) {
        return buildMapEmbedUrl(fallbackQuery);
    }

    return buildMapEmbedUrl(fallbackQuery);
};

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

    const fallbackMapQuery =
        typeof payload.address === 'string' && payload.address.trim()
            ? payload.address.trim()
            : settings.address || settings.location || 'Allagadda Andhra Pradesh';

    payload.mapEmbedUrl = await normalizeMapEmbedUrl(payload.mapEmbedUrl, fallbackMapQuery);

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
