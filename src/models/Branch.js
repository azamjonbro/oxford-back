const mongoose = require('mongoose');

const multiLangSchema = {
    uz: { type: String, required: true },
    en: { type: String, required: true },
    ru: { type: String, required: true }
};

const multiLangSchemaOptional = {
    uz: { type: String },
    en: { type: String },
    ru: { type: String }
};

const BranchSchema = new mongoose.Schema({
    name: multiLangSchema,
    address: multiLangSchema,
    phone: { type: String },
    coordinates: { type: String },
    googleMaps: { type: String },
    workingHours: multiLangSchemaOptional,
    images: [{ type: String }],
    order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Branch', BranchSchema);
