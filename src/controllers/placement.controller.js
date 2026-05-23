const { Lead, TestResult, Question, Section, Setting } = require('../models');
const https = require('https');
const Joi = require('joi');

// Input validation schema for test registration
const registerTestSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    phone: Joi.string().trim().min(7).max(20).required(),
    age: Joi.number().integer().min(5).max(100).required(),
    telegram: Joi.string().trim().allow('').optional(),
    branch: Joi.string().hex().length(24).allow('').optional()
});

// Helper function to send Telegram alerts using native HTTPS module
async function sendTelegramAlert(lead, score, level, timeSpent, warnings) {
    try {
        const tokenSetting = await Setting.findOne({ key: 'telegram_bot_token' });
        const chatIdSetting = await Setting.findOne({ key: 'telegram_chat_id' });
        if (!tokenSetting?.value || !chatIdSetting?.value) {
            console.log('Telegram credentials not configured. Skipping alert.');
            return;
        }

        const minutes = Math.floor(timeSpent / 60);
        const seconds = timeSpent % 60;
        const timeStr = `${minutes}m ${seconds}s`;

        const message = `🔔 *New Placement Test Completed!*\n\n` +
            `👤 *Name*: ${lead.name}\n` +
            `📞 *Phone*: ${lead.phone}\n` +
            `🎂 *Age*: ${lead.age}\n` +
            `✈️ *Telegram*: ${lead.telegram || 'N/A'}\n` +
            `🏫 *Branch*: ${lead.branch ? 'Selected' : 'N/A'}\n\n` +
            `📊 *Score*: ${score}%\n` +
            `🎓 *Level*: *${level}*\n` +
            `⏱️ *Time Spent*: ${timeStr}\n` +
            `⚠️ *Tab Switches (Anti-cheat)*: ${warnings}\n` +
            `📅 *Date*: ${new Date().toLocaleString()}`;

        const postData = JSON.stringify({
            chat_id: chatIdSetting.value,
            text: message,
            parse_mode: 'Markdown'
        });

        const url = `https://api.telegram.org/bot${tokenSetting.value}/sendMessage`;
        const parsedUrl = new URL(url);

        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                console.log('Telegram response:', body);
            });
        });

        req.on('error', (err) => {
            console.error('Telegram request error:', err.message);
        });

        req.write(postData);
        req.end();
    } catch (err) {
        console.error('Failed to send Telegram alert:', err.message);
    }
}

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

        const { name, phone, age, telegram, branch } = req.body;

        // Check if there is an existing in-progress test for this phone
        let lead = await Lead.findOne({ phone }).populate({
            path: 'testResult',
            match: { completionStatus: 'in-progress' }
        });

        if (lead && lead.testResult) {
            // Already has an active test, let's resume it
            const activeTest = lead.testResult;
            const rawQuestions = await Question.find({}).sort({ order: 1 });
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
            answers: []
        });
        await testResult.save();

        // Link TestResult back to Lead
        lead.testResult = testResult._id;
        await lead.save();

        // Fetch questions
        const rawQuestions = await Question.find({}).sort({ order: 1 });
        
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
        const rawQuestions = await Question.find({}).sort({ order: 1 });
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

// Submit and Grade Placement Test
exports.submitTest = async (req, res) => {
    try {
        const { testResultId, timeSpent, warnings } = req.body;

        const testResult = await TestResult.findById(testResultId);
        if (!testResult) return res.status(404).json({ message: 'Test session not found' });
        if (testResult.completionStatus === 'completed') {
            return res.status(400).json({ message: 'Test has already been completed.' });
        }

        // Fetch questions and create map for fast grading
        const questions = await Question.find({});
        const questionMap = {};
        questions.forEach(q => {
            questionMap[q._id.toString()] = q;
        });

        let correctCount = 0;
        const totalQuestions = questions.length || 1;

        // Grade each answer in testResult
        const gradedAnswers = testResult.answers.map(ans => {
            const dbQuestion = questionMap[ans.questionId.toString()];
            let isCorrect = false;

            if (dbQuestion) {
                const correctAnswers = dbQuestion.correctAnswers.map(c => c.trim().toLowerCase());
                const studentAnswers = ans.selectedAnswers.map(s => s.trim().toLowerCase());

                if (dbQuestion.type === 'single' || dbQuestion.type === 'multiple') {
                    // Match sets of correct answers
                    if (correctAnswers.length === studentAnswers.length &&
                        correctAnswers.every(val => studentAnswers.includes(val))) {
                        isCorrect = true;
                    }
                } else if (dbQuestion.type === 'text') {
                    // Text match (compare first answer item)
                    if (correctAnswers.length > 0 && studentAnswers.length > 0) {
                        isCorrect = correctAnswers.includes(studentAnswers[0]);
                    }
                }
            }

            if (isCorrect) correctCount++;
            return {
                questionId: ans.questionId,
                selectedAnswers: ans.selectedAnswers,
                isCorrect
            };
        });

        // Calculate score percentage
        const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

        // Fetch custom ranges from Setting table
        const defaultRanges = [
            { name: 'Beginner', min: 0, max: 20, recommendation: 'We recommend starting from the basics to build a strong foundation.' },
            { name: 'Elementary', min: 21, max: 40, recommendation: 'You have basic communication skills. Let\'s boost your speaking and grammar!' },
            { name: 'Pre-Intermediate', min: 41, max: 60, recommendation: 'Great progress! You can understand familiar topics. Let\'s aim for intermediate fluency.' },
            { name: 'Intermediate', min: 61, max: 80, recommendation: 'Excellent! You can express yourself in various contexts. Let\'s refine your advanced skills.' },
            { name: 'Upper-Intermediate', min: 81, max: 90, recommendation: 'Impressive score! You are very close to high fluency. Let\'s prepare for IELTS or business English.' },
            { name: 'IELTS Ready', min: 91, max: 100, recommendation: 'Outstanding! You possess advanced English skills. You are fully ready for intensive IELTS prep!' }
        ];

        const levelsSetting = await Setting.findOne({ key: 'placement_test_levels' });
        let levelRanges = defaultRanges;
        if (levelsSetting && levelsSetting.value) {
            try {
                levelRanges = JSON.parse(levelsSetting.value);
            } catch (e) {
                console.error('Failed to parse levels setting JSON:', e.message);
            }
        }

        // Determine Level
        let studentLevel = 'Beginner';
        let recommendation = 'We recommend starting from the basics to build a strong foundation.';
        for (const range of levelRanges) {
            if (scorePercentage >= range.min && scorePercentage <= range.max) {
                studentLevel = range.name;
                recommendation = range.recommendation;
                break;
            }
        }

        // Save results
        testResult.answers = gradedAnswers;
        testResult.score = scorePercentage;
        testResult.level = studentLevel;
        testResult.completionStatus = 'completed';
        testResult.completedAt = new Date();
        if (typeof timeSpent === 'number') testResult.timeSpent = timeSpent;
        if (typeof warnings === 'number') testResult.warnings = warnings;
        await testResult.save();

        // Get populated lead info for alerts
        const lead = await Lead.findById(testResult.lead).populate('branch');

        // Trigger Alerts
        await sendTelegramAlert(lead, scorePercentage, studentLevel, testResult.timeSpent, testResult.warnings);
        await sendEmailAlert(lead, scorePercentage, studentLevel);

        res.json({
            score: scorePercentage,
            level: studentLevel,
            correctCount,
            totalQuestions,
            recommendation
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};
