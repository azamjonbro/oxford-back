const mongoose = require('mongoose');

const multiLangSchema = {
    uz: { type: String, required: true },
    en: { type: String, required: true },
    ru: { type: String, required: true }
};

const HeroBannerSchema = new mongoose.Schema({
    title: multiLangSchema,
    subtitle: multiLangSchema,
    image: { type: String },
    link: { type: String }
, order: { type: Number, default: 0 } }, { timestamps: true });

module.exports = mongoose.model('HeroBanner', HeroBannerSchema);
