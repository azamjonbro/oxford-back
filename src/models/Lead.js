const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    age: { type: Number, required: true },
    telegram: { type: String },
    email: { type: String },
    candidateType: { type: String, enum: ['insider', 'outsider'], default: 'outsider' },
    preferredStudyTime: { type: String, enum: ['morning', 'afternoon', 'evening'], default: 'morning' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    status: { type: String, enum: ['New', 'Contacted', 'Registered', 'Rejected'], default: 'New' },
    testResult: { type: mongoose.Schema.Types.ObjectId, ref: 'TestResult' },
    assignedGroup: { type: String, default: '' }, // Group name set by admin, e.g. "B2 Evening – Room 3"
    assignedAt: { type: Date }, // When the admin assigned the group
    assignedBy: { type: String, default: '' }, // Admin username who assigned
    deviceInfo: {
        ip: String,
        userAgent: String,
        platform: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Lead', LeadSchema);
