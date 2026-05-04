const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
    name: { type: String, required: true },
    score: { type: String, required: true },
    date: { type: String },
    image: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Result', ResultSchema);
