// Hero banner data displayed on the public website.
const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
            default: 'VISWASHANTHI HIGH SCHOOL'
        },
        subtitle: {
            type: String,
            trim: true,
            default: 'Excellence in Education from Nursery to 10th'
        },
        ctaText: {
            type: String,
            trim: true,
            default: 'Apply Now'
        },
        ctaLink: {
            type: String,
            trim: true,
            default: 'admission.html'
        },
        image: {
            type: String,
            required: true
        },
        placement: {
            type: String,
            enum: ['hero', 'popup'],
            default: 'hero'
        },
        order: {
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

module.exports = mongoose.model('Banner', bannerSchema);
