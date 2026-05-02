// Banner CRUD logic for the public hero carousel and admin manager.
const Banner = require('../models/Banner');
const fs = require('fs').promises;
const path = require('path');
const { cleanupUnusedUploads } = require('../utils/uploadCleanup');

const removeFileIfExists = async (filePath) => {
    try {
        await fs.unlink(filePath);
    } catch (error) {
        // Ignore best-effort cleanup failures.
    }
};

const getBanners = async (req, res) => {
    const banners = await Banner.find({
        isActive: true,
        $or: [{ placement: 'hero' }, { placement: { $exists: false } }]
    }).sort({ order: 1, createdAt: -1 });
    res.status(200).json({ success: true, count: banners.length, banners });
};

const getAllBanners = async (req, res) => {
    const banners = await Banner.find({ $or: [{ placement: 'hero' }, { placement: { $exists: false } }] }).sort({
        order: 1,
        createdAt: -1
    });
    res.status(200).json({ success: true, count: banners.length, banners });
};

const getPopupBanner = async (req, res) => {
    const popupBanner = await Banner.findOne({ placement: 'popup', isActive: true }).sort({ updatedAt: -1 });
    res.status(200).json({ success: true, popupBanner });
};

const getPopupBannerAdmin = async (req, res) => {
    const popupBanner = await Banner.findOne({ placement: 'popup' }).sort({ updatedAt: -1 });
    res.status(200).json({ success: true, popupBanner });
};

const deletePopupBanner = async (req, res) => {
    const popupBanner = await Banner.findOne({ placement: 'popup' }).sort({ updatedAt: -1 });

    if (!popupBanner) {
        return res.status(404).json({ success: false, message: 'Popup banner not found' });
    }

    if (popupBanner.image) {
        const imagePath = path.join(__dirname, '..', popupBanner.image.replace(/^\//, ''));
        await removeFileIfExists(imagePath);
    }

    await popupBanner.deleteOne();

    return res.status(200).json({
        success: true,
        message: 'Popup banner deleted successfully'
    });
};

const getBanner = async (req, res) => {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
        return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    return res.status(200).json({ success: true, banner });
};

const createBanner = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload a banner image' });
    }

    const banner = await Banner.create({
        ...req.body,
        placement: 'hero',
        image: `/uploads/banners/${req.file.filename}`
    });

    return res.status(201).json({
        success: true,
        message: 'Banner created successfully',
        banner
    });
};

const upsertPopupBanner = async (req, res) => {
    let popupBanner = await Banner.findOne({ placement: 'popup' }).sort({ updatedAt: -1 });

    if (!popupBanner && !req.file) {
        return res.status(400).json({ success: false, message: 'Please upload a popup banner image' });
    }

    const updateData = {
        title: req.body.title || 'Admissions Open',
        subtitle: req.body.subtitle || '',
        ctaText: req.body.ctaText || 'Apply Now',
        ctaLink: req.body.ctaLink || 'admission.html',
        isActive: req.body.isActive === 'true' || req.body.isActive === true,
        placement: 'popup',
        order: 0
    };

    if (req.file) {
        updateData.image = `/uploads/banners/${req.file.filename}`;

        if (popupBanner?.image) {
            const oldImagePath = path.join(__dirname, '..', popupBanner.image.replace(/^\//, ''));
            await removeFileIfExists(oldImagePath);
        }
    }

    if (popupBanner) {
        Object.assign(popupBanner, updateData);
        await popupBanner.save();
    } else {
        popupBanner = await Banner.create(updateData);
    }

    return res.status(200).json({
        success: true,
        message: 'Popup banner saved successfully',
        popupBanner
    });
};

const updateBanner = async (req, res) => {
    const existingBanner = await Banner.findById(req.params.id);

    if (!existingBanner) {
        if (req.file) {
            await removeFileIfExists(req.file.path);
        }

        return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    const updateData = { ...req.body };

    if (req.file) {
        updateData.image = `/uploads/banners/${req.file.filename}`;

        if (existingBanner.image) {
            const oldImagePath = path.join(__dirname, '..', existingBanner.image.replace(/^\//, ''));
            await removeFileIfExists(oldImagePath);
        }
    }

    const banner = await Banner.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true
    });

    return res.status(200).json({
        success: true,
        message: 'Banner updated successfully',
        banner
    });
};

const deleteBanner = async (req, res) => {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
        return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    if (banner.image) {
        const imagePath = path.join(__dirname, '..', banner.image.replace(/^\//, ''));
        await removeFileIfExists(imagePath);
    }

    await banner.deleteOne();

    return res.status(200).json({
        success: true,
        message: 'Banner deleted successfully'
    });
};

const toggleBannerStatus = async (req, res) => {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
        return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    banner.isActive = !banner.isActive;
    await banner.save();

    return res.status(200).json({
        success: true,
        message: `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully`,
        banner
    });
};

const withUploadCleanup = (handler) => async (req, res) => {
    const result = await handler(req, res);
    await cleanupUnusedUploads();
    return result;
};

module.exports = {
    getBanners,
    getAllBanners,
    getPopupBanner,
    getPopupBannerAdmin,
    deletePopupBanner: withUploadCleanup(deletePopupBanner),
    getBanner,
    createBanner: withUploadCleanup(createBanner),
    upsertPopupBanner: withUploadCleanup(upsertPopupBanner),
    updateBanner: withUploadCleanup(updateBanner),
    deleteBanner: withUploadCleanup(deleteBanner),
    toggleBannerStatus
};
