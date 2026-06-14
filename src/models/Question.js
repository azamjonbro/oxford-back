const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    options: [{ type: String }],
    correctAnswers: [{ type: String }],
    type: { type: String, enum: ['single', 'multiple', 'text'], default: 'single' },
    section: { type: String, required: true }, // grammar, vocabulary, reading, listening
    category: { type: String, required: true }, // Beginner, Elementary, Pre-Intermediate, Intermediate, Upper-Intermediate, IELTS
    audioUrl: { type: String }, // for listening questions
    passage: { type: String }, // for reading section passages
    points: { type: Number, default: 1 }, // default points for the question
    order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Question', QuestionSchema);
