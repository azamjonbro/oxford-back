const mongoose = require('mongoose');

const multiLangSchema = {
    uz: { type: String, required: true },
    en: { type: String, required: true },
    ru: { type: String, required: true }
};

const BenefitSchema = new mongoose.Schema({
    title: multiLangSchema,
    description: multiLangSchema,
    icon: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Benefit', BenefitSchema);
