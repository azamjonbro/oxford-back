const mongoose = require('mongoose');

const multiLangSchema = {
    uz: { type: String, required: true },
    en: { type: String, required: true },
    ru: { type: String, required: true }
};

const TeacherSchema = new mongoose.Schema({
    name: multiLangSchema,
    position: multiLangSchema,
    bio: {
        uz: { type: String },
        en: { type: String },
        ru: { type: String }
    },
    category: { 
        type: String, 
        enum: ['teacher', 'creator', 'manager', 'head_of_edu', 'branch_head'],
        default: 'teacher'
    },
    ieltsScore: { type: String },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    photo: { type: String },
    hashtags: [String]
}, { timestamps: true });

module.exports = mongoose.model('Teacher', TeacherSchema);
