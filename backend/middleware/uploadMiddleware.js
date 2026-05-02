// Shared Multer configuration for image uploads.
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ensureDirectory = (directoryPath) => {
    fs.mkdirSync(directoryPath, { recursive: true });
};

const imageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        const error = new Error('Only image files are allowed');
        error.statusCode = 400;
        cb(error, false);
    }
};

const createUploader = (subFolder) => {
    const destination = path.join(__dirname, '..', 'uploads', subFolder);
    ensureDirectory(destination);

    const storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, destination),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            const safeName = file.originalname
                .replace(ext, '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');

            cb(null, `${Date.now()}-${safeName || 'image'}${ext}`);
        }
    });

    return multer({
        storage,
        fileFilter: imageFilter,
        limits: {
            fileSize: 5 * 1024 * 1024
        }
    });
};

module.exports = { createUploader };
