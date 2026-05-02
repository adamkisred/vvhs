// Gallery CRUD logic for school activity media.
const fs = require('fs').promises;
const path = require('path');
const { validationResult } = require('express-validator');
const Gallery = require('../models/Gallery');
const { cleanupUnusedUploads } = require('../utils/uploadCleanup');

const removeFileIfExists = async (filePath) => {
    try {
        await fs.unlink(filePath);
    } catch (error) {
        // Ignore best-effort cleanup failures.
    }
};

const getGallery = async (req, res) => {
    const gallery = await Gallery.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, gallery });
};

const getGalleryAdmin = async (req, res) => {
    const gallery = await Gallery.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, gallery });
};

const createGalleryItem = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        if (req.file) {
            await removeFileIfExists(req.file.path);
        }

        return res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Gallery image is required' });
    }

    const item = await Gallery.create({
        ...req.body,
        image: `/uploads/gallery/${req.file.filename}`
    });

    res.status(201).json({
        success: true,
        message: 'Gallery image uploaded successfully',
        item
    });
    await cleanupUnusedUploads();
};

const deleteGalleryItem = async (req, res) => {
    const item = await Gallery.findById(req.params.id);

    if (!item) {
        return res.status(404).json({ success: false, message: 'Gallery item not found' });
    }

    if (item.image) {
        const filePath = path.join(__dirname, '..', item.image.replace(/^\//, ''));
        await removeFileIfExists(filePath);
    }

    await item.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Gallery item deleted successfully'
    });
    await cleanupUnusedUploads();
};

module.exports = {
    getGallery,
    getGalleryAdmin,
    createGalleryItem,
    deleteGalleryItem
};
