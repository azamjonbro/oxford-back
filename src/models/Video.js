const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: {
        uz: { type: String, required: true },
        en: { type: String, required: true },
        ru: { type: String, required: true }
    },
    url: { type: String, required: true }, // YouTube embed URL or raw video path
    type: { type: String, enum: ['youtube', 'local'], default: 'youtube' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Video', videoSchema);
