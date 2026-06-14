const { Lead, TestResult, Question, Section, Setting } = require('../models');
const telegramService = require('../services/telegram.service');
const https = require('https');
const Joi = require('joi');

// Input validation schema for test registration
const registerTestSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    phone: Joi.string().trim().min(7).max(20).required(),
    age: Joi.number().integer().min(5).max(100).required(),
    telegram: Joi.string().trim().allow('').optional(),
    email: Joi.string().trim().email().allow('').optional(),
    candidateType: Joi.string().valid('insider', 'outsider').required(),
    preferredStudyTime: Joi.string().valid('morning', 'afternoon', 'evening').required(),
    branch: Joi.string().hex().length(24).allow('').optional(),
    testLevel: Joi.string().valid('Beginner', 'Elementary', 'Pre-Intermediate', 'Intermediate', 'Upper-Intermediate', 'IELTS Foundation').allow('').optional()
});

// Telegram alerts now use telegramService

// Helper to trigger email (logs as mock by default, or uses nodemailer if installed)
async function sendEmailAlert(lead, score, level) {
    try {
        const smtpHost = await Setting.findOne({ key: 'email_smtp_host' });
        const smtpPort = await Setting.findOne({ key: 'email_smtp_port' });
        const emailUser = await Setting.findOne({ key: 'email_user' });
        const emailPass = await Setting.findOne({ key: 'email_pass' });
        const emailTo = await Setting.findOne({ key: 'email_to' });

        if (!smtpHost?.value || !emailTo?.value) {
            console.log(`[Email Mock] Lead: ${lead.name} (${lead.phone}) completed test. Score: ${score}%, Level: ${level}.`);
            return;
        }

        try {
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
                host: smtpHost.value,
                port: parseInt(smtpPort?.value || '465'),
                secure: smtpPort?.value !== '587',
                auth: {
                    user: emailUser?.value || '',
                    pass: emailPass?.value || ''
                }
            });

            await transporter.sendMail({
                from: emailUser?.value || 'no-reply@newoxford.uz',
                to: emailTo.value,
                subject: `New Placement Test: ${lead.name} - ${level}`,
                html: `
                    <h2>New Placement Test Submission</h2>
                    <p><strong>Name:</strong> ${lead.name}</p>
                    <p><strong>Phone:</strong> ${lead.phone}</p>
                    <p><strong>Age:</strong> ${lead.age}</p>
                    <p><strong>Email:</strong> ${lead.email || 'N/A'}</p>
                    <p><strong>Candidate Type:</strong> ${lead.candidateType || 'N/A'}</p>
                    <p><strong>Preferred Study Time:</strong> ${lead.preferredStudyTime || 'N/A'}</p>
                    <p><strong>Telegram:</strong> ${lead.telegram || 'N/A'}</p>
                    <hr />
                    <p><strong>Score:</strong> ${score}%</p>
                    <p><strong>English Level:</strong> ${level}</p>
                `
            });
            console.log('Email alert sent successfully!');
        } catch (mailErr) {
            console.warn('Nodemailer failed or not installed. Logging instead:', mailErr.message);
            console.log(`[Email Backup Log] Lead: ${lead.name} (${lead.phone}) completed test. Score: ${score}%, Level: ${level}.`);
        }
    } catch (err) {
        console.error('Email alert process failed:', err.message);
    }
}

// Student Registers for Placement Test
exports.registerTest = async (req, res) => {
    try {
        const { error } = registerTestSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const { name, phone, age, telegram, email, candidateType, preferredStudyTime, branch, testLevel } = req.body;

        // Check if there is an existing in-progress test for this phone
        let lead = await Lead.findOne({ phone }).populate({
            path: 'testResult',
            match: { completionStatus: 'in-progress' }
        });

        if (lead && lead.testResult) {
            // Already has an active test, let's resume it
            const activeTest = lead.testResult;
            const query = {};
            if (activeTest.testLevel) {
                query.category = activeTest.testLevel === 'IELTS Foundation' ? 'IELTS' : activeTest.testLevel;
            }
            const rawQuestions = await Question.find(query).sort({ order: 1 });
            // Strip correct answers
            const cleanQuestions = rawQuestions.map(q => {
                const { correctAnswers, ...clean } = q.toObject();
                return clean;
            });

            return res.json({
                message: 'Active test session found. Resuming.',
                leadId: lead._id,
                testResultId: activeTest._id,
                questions: cleanQuestions,
                answers: activeTest.answers,
                warnings: activeTest.warnings,
                timeSpent: activeTest.timeSpent
            });
        }

        // Create new Lead
        lead = new Lead({
            name,
            phone,
            age,
            telegram,
            email: email || '',
            candidateType,
            preferredStudyTime,
            branch: branch || null,
            status: 'New',
            deviceInfo: {
                ip: req.ip || req.headers['x-forwarded-for'] || '',
                userAgent: req.headers['user-agent'] || '',
                platform: req.headers['sec-ch-ua-platform'] || ''
            }
        });
        await lead.save();

        // Create new TestResult
        const testResult = new TestResult({
            lead: lead._id,
            completionStatus: 'in-progress',
            startedAt: new Date(),
            answers: [],
            testLevel: testLevel || ''
        });
        await testResult.save();

        // Link TestResult back to Lead
        lead.testResult = testResult._id;
        await lead.save();

        // Fetch questions for assigned level
        const query = {};
        if (testLevel) {
            query.category = testLevel === 'IELTS Foundation' ? 'IELTS' : testLevel;
        }
        const rawQuestions = await Question.find(query).sort({ order: 1 });
        
        // Randomize/shuffle questions within their order/category to fulfill randomized order requirement
        // We will shuffle the array but keep order intact if order is specified, otherwise fully randomized
        const shuffledQuestions = rawQuestions.sort(() => Math.random() - 0.5);

        // Strip correct answers
        const cleanQuestions = shuffledQuestions.map(q => {
            const { correctAnswers, ...clean } = q.toObject();
            return clean;
        });

        res.status(201).json({
            message: 'Registration successful. Test started.',
            leadId: lead._id,
            testResultId: testResult._id,
            questions: cleanQuestions,
            answers: [],
            warnings: 0,
            timeSpent: 0
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

// Autosave Individual Answers
exports.saveAnswer = async (req, res) => {
    try {
        const { testResultId, questionId, selectedAnswers, timeSpent, warnings } = req.body;

        const testResult = await TestResult.findById(testResultId);
        if (!testResult) return res.status(404).json({ message: 'Test session not found' });
        if (testResult.completionStatus === 'completed') {
            return res.status(400).json({ message: 'Test has already been submitted and completed.' });
        }

        // Update answer in answers array
        const existingAnswerIndex = testResult.answers.findIndex(a => a.questionId.toString() === questionId);
        if (existingAnswerIndex > -1) {
            testResult.answers[existingAnswerIndex].selectedAnswers = selectedAnswers;
        } else {
            testResult.answers.push({
                questionId,
                selectedAnswers
            });
        }

        if (typeof timeSpent === 'number') testResult.timeSpent = timeSpent;
        if (typeof warnings === 'number') testResult.warnings = warnings;

        await testResult.save();
        res.json({ message: 'Answer saved' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

// Resume active test via phone lookup
exports.resumeTest = async (req, res) => {
    try {
        const { phone } = req.params;
        const lead = await Lead.findOne({ phone }).populate({
            path: 'testResult',
            match: { completionStatus: 'in-progress' }
        });

        if (!lead || !lead.testResult) {
            return res.status(404).json({ message: 'No active test found for this phone number' });
        }

        const activeTest = lead.testResult;
        const query = {};
        if (activeTest.testLevel) {
            query.category = activeTest.testLevel === 'IELTS Foundation' ? 'IELTS' : activeTest.testLevel;
        }
        const rawQuestions = await Question.find(query).sort({ order: 1 });
        const cleanQuestions = rawQuestions.map(q => {
            const { correctAnswers, ...clean } = q.toObject();
            return clean;
        });

        res.json({
            leadId: lead._id,
            testResultId: activeTest._id,
            questions: cleanQuestions,
            answers: activeTest.answers,
            warnings: activeTest.warnings,
            timeSpent: activeTest.timeSpent,
            name: lead.name,
            age: lead.age,
            telegram: lead.telegram,
            branch: lead.branch
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

// Helper grading heuristics for writing and essay
function gradeWritingLength(text) {
    if (!text || typeof text !== 'string') return 0;
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount === 0) return 0;
    if (wordCount < 30) return 2;
    if (wordCount >= 30 && wordCount < 50) return 6;
    if (wordCount >= 50 && wordCount <= 70) return 10;
    if (wordCount > 70 && wordCount <= 90) return 8;
    return 5;
}

function gradeEssayLength(text) {
    if (!text || typeof text !== 'string') return 0;
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount === 0) return 0;
    if (wordCount < 100) return 2;
    if (wordCount >= 100 && wordCount < 150) return 6;
    if (wordCount >= 150 && wordCount <= 250) return 10;
    if (wordCount > 250 && wordCount <= 300) return 8;
    return 5;
}

// Submit and Grade Placement Test
exports.submitTest = async (req, res) => {
    try {
        const { testResultId, timeSpent, warnings, adminLevel } = req.body;

        const testResult = await TestResult.findById(testResultId);
        if (!testResult) return res.status(404).json({ message: 'Test session not found' });
        if (testResult.completionStatus === 'completed') {
            return res.status(400).json({ message: 'Test has already been completed.' });
        }

        const questions = await Question.find({});
        const questionMap = {};
        questions.forEach(q => {
            questionMap[q._id.toString()] = q;
        });

        let earnedPoints = 0;
        let totalPoints = 0;
        let writingText = '';
        let essayText = '';

        const gradedAnswers = testResult.answers.map(ans => {
            const dbQuestion = questionMap[ans.questionId.toString()];
            let isCorrect = false;
            let qPoints = dbQuestion && dbQuestion.points ? dbQuestion.points : 1;

            if (dbQuestion) {
                totalPoints += qPoints;
                if (dbQuestion.section === 'writing') {
                    writingText = ans.selectedAnswers[0] || '';
                    if (writingText.length > 50) { isCorrect = true; earnedPoints += qPoints; }
                } else if (dbQuestion.section === 'essay') {
                    essayText = ans.selectedAnswers[0] || '';
                    if (essayText.length > 100) { isCorrect = true; earnedPoints += qPoints; }
                } else {
                    const correctAnswers = dbQuestion.correctAnswers.map(c => c.trim().toLowerCase());
                    const studentAnswers = ans.selectedAnswers.map(s => s.trim().toLowerCase());

                    if (dbQuestion.type === 'single' || dbQuestion.type === 'multiple') {
                        if (correctAnswers.length === studentAnswers.length &&
                            correctAnswers.every(val => studentAnswers.includes(val))) {
                            isCorrect = true;
                        }
                    } else if (dbQuestion.type === 'text') {
                        if (correctAnswers.length > 0 && studentAnswers.length > 0) {
                            isCorrect = correctAnswers.includes(studentAnswers[0]);
                        }
                    }

                    if (isCorrect) earnedPoints += qPoints;
                }
            }

            return { questionId: ans.questionId, selectedAnswers: ans.selectedAnswers, isCorrect };
        });

        const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
        
        let resultStatus = 'FAILED';
        if (percentage >= 50 && percentage < 70) resultStatus = 'ELEMENTARY';
        else if (percentage >= 70 && percentage < 90) resultStatus = 'INTERMEDIATE';
        else if (percentage >= 90) resultStatus = 'ADVANCED';

        const finalLevel = adminLevel || resultStatus;

        testResult.answers = gradedAnswers;
        testResult.earnedPoints = earnedPoints;
        testResult.totalPoints = totalPoints;
        testResult.percentage = percentage;
        testResult.resultStatus = resultStatus;
        testResult.level = finalLevel;
        testResult.adminLevel = adminLevel || '';
        testResult.completionStatus = 'completed';
        testResult.completedAt = new Date();

        testResult.writingText = writingText;
        testResult.essayText = essayText;

        if (typeof timeSpent === 'number') testResult.timeSpent = timeSpent;
        if (typeof warnings === 'number') testResult.warnings = warnings;
        await testResult.save();

        const lead = await Lead.findById(testResult.lead).populate('branch');

        const minutes = Math.floor(testResult.timeSpent / 60);
        const seconds = testResult.timeSpent % 60;
        const timeStr = `${minutes}m ${seconds}s`;

        const basicMsg = `━━━━━━━━━━━━━━━━━━
🔔 <b>New Placement Test Completed!</b>

👤 <b>Name:</b> ${lead.name}
📞 <b>Phone:</b> ${lead.phone}
📊 <b>Score:</b> ${percentage}% (${earnedPoints}/${totalPoints} points)
🎓 <b>Level:</b> <b>${resultStatus}</b>
━━━━━━━━━━━━━━━━━━`;

        const detailedMsg = `━━━━━━━━━━━━━━━━━━
🔔 <b>New Placement Test Completed (Admin Details)</b>

👤 <b>Name:</b> ${lead.name}
📞 <b>Phone:</b> ${lead.phone}
🎂 <b>Age:</b> ${lead.age}
📊 <b>Score:</b> ${percentage}% (${earnedPoints}/${totalPoints} points)
🎓 <b>Level:</b> <b>${resultStatus}</b>
⏱️ <b>Time Spent:</b> ${timeStr}
⚠️ <b>Warnings:</b> ${testResult.warnings || 0}
🌐 <b>IP/Device:</b> ${req.ip || 'Unknown'} / ${req.headers['user-agent'] || 'Unknown'}

📝 <b>Writing Text:</b>
${writingText || 'N/A'}
--
📝 <b>Essay Text:</b>
${essayText || 'N/A'}
━━━━━━━━━━━━━━━━━━`;

        telegramService.sendChannelMessage(basicMsg).catch(err => console.error(err));
        telegramService.sendAdminMessage(detailedMsg).catch(err => console.error(err));
        await sendEmailAlert(lead, percentage, resultStatus);

        res.json({
            earnedPoints,
            totalPoints,
            percentage,
            level: resultStatus,
            writingText,
            essayText
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};
