// Admission form submissions from prospective students.
const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema(
    {
        studentName: {
            type: String,
            required: true,
            trim: true
        },
        className: {
            type: String,
            required: true,
            trim: true
        },
        parentName: {
            type: String,
            required: true,
            trim: true
        },
        phone: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        address: {
            type: String,
            required: true,
            trim: true
        },
        status: {
            type: String,
            enum: ['New', 'Reviewed', 'Contacted', 'Closed'],
            default: 'New'
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Admission', admissionSchema);
