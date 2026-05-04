const mongoose = require('mongoose');

const multiLangSchema = {
    uz: { type: String, required: true },
    en: { type: String, required: true },
    ru: { type: String, required: true }
};

const FaqSchema = new mongoose.Schema({
    question: multiLangSchema,
    answer: multiLangSchema
}, { timestamps: true });

module.exports = mongoose.model('Faq', FaqSchema);
