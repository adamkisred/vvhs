// Express application bootstrap for the school management system.
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const admissionRoutes = require('./routes/admissionRoutes');
const contactRoutes = require('./routes/contactRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const { cleanupUnusedUploads } = require('./utils/uploadCleanup');
const { getJwtSecret } = require('./utils/authSecurity');
const { securityHeaders } = require('./utils/securityHeaders');
const Admin = require('./models/Admin');
const Settings = require('./models/Settings');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const frontendDir = path.resolve(__dirname, '../frontend');

getJwtSecret();

app.set('trust proxy', 1);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const ensureUploadDirectories = () => {
    ['uploads/banners', 'uploads/faculty', 'uploads/gallery'].forEach((folder) => {
        fs.mkdirSync(path.join(__dirname, folder), { recursive: true });
    });
};

const seedDefaults = async () => {
    const adminCount = await Admin.countDocuments();

    if (adminCount === 0) {
        await Admin.create({
            username: process.env.ADMIN_USERNAME || 'admin',
            password: process.env.ADMIN_PASSWORD || 'admin123',
            name: 'School Administrator'
        });

        console.log('Default admin created. Please change the password after first login.');
    }

    const settings = await Settings.findOne();

    if (!settings) {
        await Settings.create({});
        console.log('Default settings created.');
    }
};

app.use(
    cors({
        origin(origin, callback) {
            if (!origin || origin === 'null' || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error('Origin not allowed by CORS'));
        },
        credentials: true
    })
);
app.use(securityHeaders);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'VISWASHANTHI HIGH SCHOOL API is running'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/banner', bannerRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/admission', admissionRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/settings', settingsRoutes);

app.use(express.static(frontendDir));

app.get('/', (req, res) => {
    res.sendFile(path.join(frontendDir, 'index.html'));
});

app.get(/^\/(?!api(?:\/|$)|uploads(?:\/|$)).*/, (req, res, next) => {
    const requestedPath = path.join(frontendDir, req.path);

    if (path.extname(req.path)) {
        if (fs.existsSync(requestedPath)) {
            return res.sendFile(requestedPath);
        }

        return next();
    }

    return res.sendFile(path.join(frontendDir, 'index.html'));
});

app.use((req, res) => {
    const wantsJson = req.originalUrl.startsWith('/api/');

    if (!wantsJson) {
        return res.status(404).sendFile(path.join(frontendDir, 'index.html'));
    }

    return res.status(404).json({
        success: false,
        message: `Route not found: ${req.originalUrl}`
    });
});

app.use((error, req, res, next) => {
    console.error(error);

    if (error instanceof multer.MulterError) {
        const message = error.code === 'LIMIT_FILE_SIZE' ? 'Image size must be 5MB or less' : error.message;

        return res.status(400).json({
            success: false,
            message
        });
    }

    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        message: error.message || 'Internal server error'
    });
});

const startServer = async () => {
    ensureUploadDirectories();
    await connectDB();
    await seedDefaults();
    await cleanupUnusedUploads();

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
};

startServer();
