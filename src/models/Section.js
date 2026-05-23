const mongoose = require('mongoose');

const SectionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    key: { type: String, required: true, unique: true }, // grammar, vocabulary, reading, listening
    isActive: { type: Boolean, default: true },
    timer: { type: Number }, // optional timer in minutes for this section
    order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Section', SectionSchema);
