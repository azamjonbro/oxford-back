const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
    name: { type: String, required: true },
    score: { type: String, required: true },
    date: { type: String },
    image: { type: String },
    order: { type: Number, default: 0 } }, { timestamps: true });

module.exports = mongoose.model('Result', ResultSchema);
