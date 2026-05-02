// Faculty CRUD logic for public website and admin dashboard.
const fs = require('fs').promises;
const path = require('path');
const { validationResult } = require('express-validator');
const Faculty = require('../models/Faculty');
const { cleanupUnusedUploads } = require('../utils/uploadCleanup');

const removeFileIfExists = async (filePath) => {
    try {
        await fs.unlink(filePath);
    } catch (error) {
        // Ignore file cleanup failures after best-effort attempt.
    }
};

const getFaculty = async (req, res) => {
    const faculty = await Faculty.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 });
    res.status(200).json({ success: true, faculty });
};

const getFacultyAdmin = async (req, res) => {
    const faculty = await Faculty.find().sort({ displayOrder: 1, createdAt: -1 });
    res.status(200).json({ success: true, faculty });
};

const createFaculty = async (req, res) => {
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
        return res.status(400).json({ success: false, message: 'Faculty photo is required' });
    }

    const faculty = await Faculty.create({
        ...req.body,
        photo: `/uploads/faculty/${req.file.filename}`
    });

    res.status(201).json({
        success: true,
        message: 'Faculty member created successfully',
        faculty
    });
    await cleanupUnusedUploads();
};

const updateFaculty = async (req, res) => {
    const existing = await Faculty.findById(req.params.id);

    if (!existing) {
        if (req.file) {
            await removeFileIfExists(req.file.path);
        }

        return res.status(404).json({ success: false, message: 'Faculty member not found' });
    }

    const payload = { ...req.body };

    if (req.file) {
        payload.photo = `/uploads/faculty/${req.file.filename}`;

        if (existing.photo) {
            const existingPath = path.join(__dirname, '..', existing.photo.replace(/^\//, ''));
            await removeFileIfExists(existingPath);
        }
    }

    const faculty = await Faculty.findByIdAndUpdate(req.params.id, payload, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        message: 'Faculty member updated successfully',
        faculty
    });
    await cleanupUnusedUploads();
};

const deleteFaculty = async (req, res) => {
    const faculty = await Faculty.findById(req.params.id);

    if (!faculty) {
        return res.status(404).json({ success: false, message: 'Faculty member not found' });
    }

    if (faculty.photo) {
        const filePath = path.join(__dirname, '..', faculty.photo.replace(/^\//, ''));
        await removeFileIfExists(filePath);
    }

    await faculty.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Faculty member deleted successfully'
    });
    await cleanupUnusedUploads();
};

module.exports = {
    getFaculty,
    getFacultyAdmin,
    createFaculty,
    updateFaculty,
    deleteFaculty
};
