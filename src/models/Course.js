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
    price: { type: Number, required: true },
    image: { type: String },
    hashtags: [String]
}, { timestamps: true });

module.exports = mongoose.model('Course', CourseSchema);
