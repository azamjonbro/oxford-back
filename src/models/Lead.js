const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    age: { type: Number, required: true },
    telegram: { type: String },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    status: { type: String, enum: ['New', 'Contacted', 'Registered', 'Rejected'], default: 'New' },
    testResult: { type: mongoose.Schema.Types.ObjectId, ref: 'TestResult' },
    deviceInfo: {
        ip: String,
        userAgent: String,
        platform: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Lead', LeadSchema);
