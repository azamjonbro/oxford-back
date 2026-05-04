const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    text: { type: String },
    status: { type: String, default: 'new' }
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
