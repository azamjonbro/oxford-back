const mongoose = require('mongoose');

const TestResultSchema = new mongoose.Schema({
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    score: { type: Number, default: 0 }, // 0 to 100 percentage score
    level: { type: String, default: 'Beginner' },
    testLevel: { type: String }, // Level assigned by admin at registration (e.g. Beginner, Intermediate)
    adminLevel: { type: String }, // Level assigned by admin at final submission

    answers: [{
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
        selectedAnswers: [{ type: String }], // Array of strings (handles single/multiple choice and text entries)
        isCorrect: { type: Boolean, default: false }
    }],
    completionStatus: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress' },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    timeSpent: { type: Number, default: 0 }, // in seconds
    warnings: { type: Number, default: 0 }, // tab-switching count for anti-cheat
    
    // Detailed Section Scores
    grammarScore: { type: Number, default: 0 }, // Out of 20
    vocabularyScore: { type: Number, default: 0 }, // Out of 20
    mistakeScore: { type: Number, default: 0 }, // Out of 10
    sentenceScore: { type: Number, default: 0 }, // Out of 10
    readingScore: { type: Number, default: 0 }, // Out of 10
    listeningScore: { type: Number, default: 0 }, // Out of 10
    writingScore: { type: Number, default: 0 }, // Out of 10
    essayScore: { type: Number, default: 0 }, // Out of 10
    speakingScore: { type: Number, default: 0 }, // Out of 10
    
    // Text responses cached for easier rendering
    writingText: { type: String, default: '' },
    essayText: { type: String, default: '' },
    
    // Manual review tracking
    writingGraded: { type: Boolean, default: false },
    essayGraded: { type: Boolean, default: false },
    speakingGraded: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('TestResult', TestResultSchema);
