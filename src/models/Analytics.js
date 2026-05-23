const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
    ip: String,
    userAgent: String,
    path: String,
    referer: String,
    device: String,
    country: String,
    ageRange: String, // Calculated/Inferred
    gender: String,   // Calculated/Inferred
    timestamp: { type: Date, default: Date.now }
, order: { type: Number, default: 0 } }, { timestamps: true });

module.exports = mongoose.model('Analytics', AnalyticsSchema);
