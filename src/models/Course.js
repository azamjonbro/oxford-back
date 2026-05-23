const mongoose = require('mongoose');

const multiLangSchema = {
    uz: { type: String, required: true },
    en: { type: String, required: true },
    ru: { type: String, required: true }
};

const CourseSchema = new mongoose.Schema({
    title: multiLangSchema,
    description: multiLangSchema,
    duration: multiLangSchema,
    category: { type: String },
    image: { type: String },
    hashtags: [String],
    time: { type: String },
    seats: { type: Number }
, order: { type: Number, default: 0 } }, { timestamps: true });

module.exports = mongoose.model('Course', CourseSchema);
