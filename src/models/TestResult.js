const mongoose = require('mongoose');

const TestResultSchema = new mongoose.Schema({
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    score: { type: Number, default: 0 }, // 0 to 100 percentage score
    level: { type: String, default: 'Beginner' },
    answers: [{
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
        selectedAnswers: [{ type: String }], // Array of strings (handles single/multiple choice and text entries)
        isCorrect: { type: Boolean, default: false }
    }],
    completionStatus: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress' },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    timeSpent: { type: Number, default: 0 }, // in seconds
    warnings: { type: Number, default: 0 } // tab-switching count for anti-cheat
}, { timestamps: true });

module.exports = mongoose.model('TestResult', TestResultSchema);
