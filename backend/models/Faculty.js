// Faculty members for the academic team showcase.
const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        subject: {
            type: String,
            required: true,
            trim: true
        },
        qualification: {
            type: String,
            trim: true,
            default: ''
        },
        experience: {
            type: String,
            trim: true,
            default: ''
        },
        bio: {
            type: String,
            trim: true,
            default: ''
        },
        photo: {
            type: String,
            required: true
        },
        displayOrder: {
            type: Number,
            default: 0
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Faculty', facultySchema);
