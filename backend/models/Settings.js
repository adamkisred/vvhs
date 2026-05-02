// Singleton settings document powering dynamic public content and email config.
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
    {
        schoolName: {
            type: String,
            default: 'VISWASHANTHI HIGH SCHOOL'
        },
        location: {
            type: String,
            default: 'Allagadda'
        },
        classesRange: {
            type: String,
            default: 'Nursery to 10th'
        },
        aboutUs: {
            type: String,
            default: 'VISWASHANTHI HIGH SCHOOL in Allagadda provides value-based education, disciplined learning, and a vibrant academic environment from Nursery to 10th class.'
        },
        contactPhone: {
            type: String,
            default: '+91 90000 00000'
        },
        contactEmail: {
            type: String,
            default: 'info@viswashanthischool.com'
        },
        admissionReceiverEmail: {
            type: String,
            default: 'admissions@viswashanthischool.com'
        },
        address: {
            type: String,
            default: 'Main Road, Allagadda, Andhra Pradesh'
        },
        mapEmbedUrl: {
            type: String,
            default: 'https://maps.google.com/maps?width=100%25&height=600&hl=en&q=Allagadda%20Andhra%20Pradesh&t=&z=14&ie=UTF8&iwloc=B&output=embed'
        },
        mailHost: {
            type: String,
            default: ''
        },
        mailPort: {
            type: Number,
            default: 587
        },
        mailSecure: {
            type: Boolean,
            default: false
        },
        mailUser: {
            type: String,
            default: ''
        },
        mailPass: {
            type: String,
            default: ''
        },
        heroTagline: {
            type: String,
            default: 'Nurturing curiosity, character, and confidence'
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Settings', settingsSchema);
