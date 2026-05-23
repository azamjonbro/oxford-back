const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Setting', SettingSchema);
