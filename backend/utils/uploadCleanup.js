const fs = require('fs').promises;
const path = require('path');
const Banner = require('../models/Banner');
const Faculty = require('../models/Faculty');
const Gallery = require('../models/Gallery');

const toRelativeUploadPath = (value = '') => String(value || '').replace(/^\/+/, '').replace(/\\/g, '/');

const deleteIfOrphaned = async (directoryPath, referencedPaths) => {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
        if (!entry.isFile() || entry.name === '.gitkeep') {
            continue;
        }

        const relativePath = toRelativeUploadPath(path.posix.join(path.basename(directoryPath), entry.name)).replace(
            /^/,
            'uploads/'
        );

        if (!referencedPaths.has(relativePath)) {
            await fs.unlink(path.join(directoryPath, entry.name)).catch(() => {});
        }
    }
};

const cleanupUnusedUploads = async () => {
    const [banners, faculty, gallery] = await Promise.all([
        Banner.find({}, 'image').lean(),
        Faculty.find({}, 'photo').lean(),
        Gallery.find({}, 'image').lean()
    ]);

    const referencedPaths = new Set([
        ...banners.map((item) => toRelativeUploadPath(item.image)),
        ...faculty.map((item) => toRelativeUploadPath(item.photo)),
        ...gallery.map((item) => toRelativeUploadPath(item.image))
    ]);

    const uploadsRoot = path.join(__dirname, '..', 'uploads');

    await Promise.all([
        deleteIfOrphaned(path.join(uploadsRoot, 'banners'), referencedPaths),
        deleteIfOrphaned(path.join(uploadsRoot, 'faculty'), referencedPaths),
        deleteIfOrphaned(path.join(uploadsRoot, 'gallery'), referencedPaths)
    ]);
};

module.exports = {
    cleanupUnusedUploads
};
