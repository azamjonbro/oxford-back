const mongoose = require('mongoose');

const multiLangSchema = {
    uz: { type: String, required: true },
    en: { type: String, required: true },
    ru: { type: String, required: true }
};

const EventSchema = new mongoose.Schema({
    title: multiLangSchema,
    description: multiLangSchema,
    location: multiLangSchema,
    date: { type: String, required: true },
    time: { type: String },
    type: { type: String },
    image: { type: String }
, order: { type: Number, default: 0 } }, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
