// Gallery images for public events and campus activity highlights.
const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
            default: 'Campus Event'
        },
        category: {
            type: String,
            trim: true,
            default: 'Campus'
        },
        image: {
            type: String,
            required: true
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

module.exports = mongoose.model('Gallery', gallerySchema);
