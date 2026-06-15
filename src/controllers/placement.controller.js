const { Lead, TestResult, Question, Section, Setting } = require('../models');
const telegramService = require('../services/telegram.service');
const https = require('https');
const Joi = require('joi');

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
                auth: { user: emailUser?.value || '', pass: emailPass?.value || '' }
            });

            await transporter.sendMail({
                from: emailUser?.value || 'no-reply@newoxford.uz',
                to: emailTo.value,
                subject: `New Placement Test: ${lead.name} - ${level}`,
                html: `
                    <h2>New Placement Test Submission</h2>
                    <p><strong>Name:</strong> ${lead.name}</p>
                    <p><strong>Phone:</strong> ${lead.phone}</p>
                    <p><strong>Score:</strong> ${score}%</p>
                    <p><strong>English Level:</strong> ${level}</p>
                `
            });
        } catch (mailErr) {
            console.warn('Nodemailer failed:', mailErr.message);
        }
    } catch (err) {
        console.error('Email alert failed:', err.message);
    }
}

exports.registerTest = async (req, res) => {
    try {
        const { error } = registerTestSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const { name, phone, age, telegram, email, candidateType, preferredStudyTime, branch, testLevel } = req.body;

        let lead = await Lead.findOne({ phone }).populate({
            path: 'testResult',
            match: { completionStatus: 'in-progress' }
        });

        if (lead && lead.testResult) {
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

        lead = new Lead({
            name, phone, age, telegram,
            email: email || '',
            candidateType, preferredStudyTime,
            branch: branch || null,
            status: 'New',
            deviceInfo: {
                ip: req.ip || req.headers['x-forwarded-for'] || '',
                userAgent: req.headers['user-agent'] || '',
                platform: req.headers['sec-ch-ua-platform'] || ''
            }
        });
        await lead.save();

        const testResult = new TestResult({
            lead: lead._id,
            completionStatus: 'in-progress',
            startedAt: new Date(),
            answers: [],
            testLevel: testLevel || ''
        });
        await testResult.save();

        lead.testResult = testResult._id;
        await lead.save();

        const extraFields = `Age: ${age}\nTelegram: ${telegram || 'N/A'}\nEmail: ${email || 'N/A'}\nCandidate Type: ${candidateType}\nPreferred Time: ${preferredStudyTime}\nAssigned Level: ${testLevel || 'Auto'}`;
        telegramService.sendLeadNotification({
            formType: 'Placement Test Registration',
            fullname: name, phone,
            createdAt: new Date().toLocaleString('en-GB'),
            extraFields
        }).catch(err => console.error('Telegram lead notify error:', err));

        const query = {};
        if (testLevel) {
            query.category = testLevel === 'IELTS Foundation' ? 'IELTS' : testLevel;
        }
        const rawQuestions = await Question.find(query).sort({ order: 1 });
        const shuffledQuestions = rawQuestions.sort(() => Math.random() - 0.5);
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

exports.saveAnswer = async (req, res) => {
    try {
        const { testResultId, questionId, selectedAnswers, timeSpent, warnings } = req.body;

        const testResult = await TestResult.findById(testResultId);
        if (!testResult) return res.status(404).json({ message: 'Test session not found' });
        if (testResult.completionStatus === 'completed') {
            return res.status(400).json({ message: 'Test has already been submitted and completed.' });
        }

        const existingAnswerIndex = testResult.answers.findIndex(a => a.questionId.toString() === questionId);
        if (existingAnswerIndex > -1) {
            testResult.answers[existingAnswerIndex].selectedAnswers = selectedAnswers;
        } else {
            testResult.answers.push({ questionId, selectedAnswers });
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
        questions.forEach(q => { questionMap[q._id.toString()] = q; });

        // Dinamik sectionStats — DB dagi haqiqiy section nomlaridan
        const sectionStats = {};

        let earnedPoints = 0;
        let totalPoints = 0;
        let writingText = '';
        let essayText = '';

        const gradedAnswers = testResult.answers.map(ans => {
            const dbQuestion = questionMap[ans.questionId.toString()];
            let isCorrect = false;
            let qPoints = dbQuestion?.points || 1;
            const section = dbQuestion?.section || 'unknown';

            if (dbQuestion) {
                // Dinamik section yaratish
                if (!sectionStats[section]) {
                    sectionStats[section] = { earned: 0, total: 0, correct: 0, wrong: 0 };
                }

                totalPoints += qPoints;
                sectionStats[section].total += qPoints;

                if (section === 'writing') {
                    writingText = ans.selectedAnswers[0] || '';
                    const wc = writingText.trim().split(/\s+/).filter(w => w.length > 0).length;
                    const wScore = wc === 0 ? 0 : wc < 30 ? 2 : wc < 50 ? 6 : wc <= 70 ? 10 : wc <= 90 ? 8 : 5;
                    if (wScore >= 6) isCorrect = true;
                    earnedPoints += wScore;
                    sectionStats[section].earned += wScore;
                    if (isCorrect) sectionStats[section].correct++;
                    else sectionStats[section].wrong++;

                } else if (section === 'essay') {
                    essayText = ans.selectedAnswers[0] || '';
                    const wc = essayText.trim().split(/\s+/).filter(w => w.length > 0).length;
                    const eScore = wc === 0 ? 0 : wc < 100 ? 2 : wc < 150 ? 6 : wc <= 250 ? 10 : wc <= 300 ? 8 : 5;
                    if (eScore >= 6) isCorrect = true;
                    earnedPoints += eScore;
                    sectionStats[section].earned += eScore;
                    if (isCorrect) sectionStats[section].correct++;
                    else sectionStats[section].wrong++;

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

                    if (isCorrect) {
                        earnedPoints += qPoints;
                        sectionStats[section].earned += qPoints;
                        sectionStats[section].correct++;
                    } else {
                        sectionStats[section].wrong++;
                    }
                }
            }

            return { questionId: ans.questionId, selectedAnswers: ans.selectedAnswers, isCorrect };
        });

        // Score — har section earned pointlari yig'indisi
        const score = Object.values(sectionStats).reduce((sum, s) => sum + s.earned, 0);
        const maxPossible = totalPoints || 100;
        const percentage = Math.min(Math.round((score / maxPossible) * 100), 100);

        // Eski fixed score fieldlari (backward compat)
        const grammarScore    = sectionStats['grammar']?.earned    || 0;
        const vocabularyScore = sectionStats['vocabulary']?.earned || 0;
        const mistakeScore    = sectionStats['mistake']?.earned    || sectionStats['correct_mistake']?.earned || 0;
        const sentenceScore   = sectionStats['sentence']?.earned   || sectionStats['sentence_builder']?.earned || 0;
        const readingScore    = sectionStats['reading']?.earned    || 0;
        const listeningScore  = sectionStats['listening']?.earned  || 0;
        const writingScore    = sectionStats['writing']?.earned    || 0;
        const essayScore      = sectionStats['essay']?.earned      || 0;

        // Daraja aniqlash (percentage asosida)
        const defaultRanges = [
            { name: 'Beginner',           min: 0,  max: 39,  recommendation: 'Asoslardan boshlashni tavsiya etamiz. Siz hali yo\'lning boshidasiz — lekin har bir qadam muhim!' },
            { name: 'Elementary',         min: 40, max: 59,  recommendation: 'Boshlang\'ich ko\'nikmalaringiz bor. Grammatika va gapirish ko\'nikmalaringizni birga rivojlantiramiz!' },
            { name: 'Pre-Intermediate',   min: 60, max: 74,  recommendation: 'Yaxshi natija! Tanish mavzularni tushunasiz. O\'rta daraja savodxonligini maqsad qilaylik.' },
            { name: 'Intermediate',       min: 75, max: 84,  recommendation: 'Ajoyib! Turli vaziyatlarda o\'zingizni ifoda eta olasiz. Ilg\'or ko\'nikmalarni rivojlantiramiz.' },
            { name: 'Upper-Intermediate', min: 85, max: 92,  recommendation: 'Impressive! Yuqori savodxonlikka juda yaqinsiz. IELTS yoki biznes ingliz tiliga tayyorlanamiz.' },
            { name: 'IELTS Foundation',   min: 93, max: 100, recommendation: 'Ajoyib natija! Ilg\'or ko\'nikmalaringiz bor. Intensiv IELTS tayyorgarligiga to\'liq tayyorsiz!' }
        ];

        let levelRanges = defaultRanges;
        try {
            const levelsSetting = await Setting.findOne({ key: 'placement_test_levels' });
            if (levelsSetting?.value) levelRanges = JSON.parse(levelsSetting.value);
        } catch (e) {}

        let resultLevel = 'Beginner';
        let recommendation = defaultRanges[0].recommendation;
        for (const range of levelRanges) {
            if (percentage >= range.min && percentage <= range.max) {
                resultLevel = range.name;
                recommendation = range.recommendation || '';
                break;
            }
        }

        // Keyingi daraja tavsiyasi
        const levelOrder = ['Beginner', 'Elementary', 'Pre-Intermediate', 'Intermediate', 'Upper-Intermediate', 'IELTS Foundation'];
        const currentLevelIdx = levelOrder.indexOf(resultLevel);
        const nextLevel = currentLevelIdx >= 0 && currentLevelIdx < levelOrder.length - 1
            ? levelOrder[currentLevelIdx + 1]
            : null;

        // Natija tavsiyasi (% asosida)
        let performanceNote = '';
        if (percentage >= 85) {
            performanceNote = nextLevel
                ? `Siz bu darajani a'lo bilasiz! ${nextLevel} darajasiga o'tishga tayyorsiz.`
                : 'Siz eng yuqori darajani egallayapsiz. IELTS ga tayyorlanish vaqti!';
        } else if (percentage >= 60) {
            performanceNote = `Siz ${resultLevel} darajasida o'qishga tayyorsiz.`;
        } else if (percentage >= 40) {
            performanceNote = `Siz ${resultLevel} darajasini biroz bilasiz. Mustahkamlash tavsiya etiladi.`;
        } else {
            performanceNote = currentLevelIdx > 0
                ? `Oldingi daraja (${levelOrder[currentLevelIdx - 1] || resultLevel}) dan boshlashni tavsiya etamiz.`
                : 'Asoslardan boshlashni tavsiya etamiz.';
        }

        const finalLevel = adminLevel || resultLevel;

        // Noto'g'ri javoblar (writing/essay bundan mustasno)
        const wrongAnswers = gradedAnswers
            .filter(a => !a.isCorrect)
            .map(a => {
                const dbQ = questionMap[a.questionId.toString()];
                return {
                    section: dbQ?.section || '',
                    category: dbQ?.category || '',
                    questionText: dbQ?.text || '',
                    correctAnswers: dbQ?.correctAnswers || [],
                    studentAnswers: a.selectedAnswers
                };
            })
            .filter(a => a.section !== 'writing' && a.section !== 'essay');

        // Section summary (faqat savol bo'lgan sectionlar)
        const sectionSummary = {};
        for (const [sec, stat] of Object.entries(sectionStats)) {
            const total = stat.correct + stat.wrong;
            if (total > 0) {
                sectionSummary[sec] = {
                    correct: stat.correct,
                    wrong: stat.wrong,
                    total: total
                };
            }
        }

        const totalCorrect = gradedAnswers.filter(a => a.isCorrect).length;
        const totalAnswered = gradedAnswers.length;

        // TestResult saqlash
        testResult.answers = gradedAnswers;
        testResult.earnedPoints = earnedPoints;
        testResult.totalPoints = totalPoints;
        testResult.score = score;
        testResult.percentage = percentage;
        testResult.resultStatus = '';
        testResult.level = finalLevel;
        testResult.grammarScore    = grammarScore;
        testResult.vocabularyScore = vocabularyScore;
        testResult.mistakeScore    = mistakeScore;
        testResult.sentenceScore   = sentenceScore;
        testResult.readingScore    = readingScore;
        testResult.listeningScore  = listeningScore;
        testResult.writingScore    = writingScore;
        testResult.essayScore      = essayScore;
        testResult.completionStatus = 'completed';
        testResult.completedAt = new Date();
        testResult.writingText = writingText;
        testResult.essayText = essayText;
        if (typeof timeSpent === 'number') testResult.timeSpent = timeSpent;
        if (typeof warnings === 'number') testResult.warnings = warnings;
        await testResult.save();

        const lead = await Lead.findById(testResult.lead).populate('branch');

        // Telegram uchun section breakdown
        const sectionBreakdownLines = Object.entries(sectionSummary)
            .map(([sec, stat]) => `${sec}: ✅${stat.correct} ❌${stat.wrong} / ${stat.total}`)
            .join('\n');

        telegramService.sendTestResultNotifications({
            fullname: lead.name,
            phone: lead.phone,
            score: `${totalCorrect}/${totalAnswered} (${percentage}%)`,
            level: finalLevel,
            status: percentage >= 60 ? 'MUVAFFAQIYATLI' : 'MUVAFFAQIYATSIZ',
            warnings: testResult.warnings || 0,
            writingText,
            essayText,
            speakingText: 'N/A',
            ip: req.ip || req.headers['x-forwarded-for'] || 'Noma\'lum',
            deviceInfo: req.headers['user-agent'] || 'Noma\'lum',
            sectionBreakdown: sectionBreakdownLines,
            rawResultJson: {
                score, percentage, level: finalLevel,
                totalCorrect, totalAnswered,
                sectionSummary,
                completedAt: testResult.completedAt
            }
        }).catch(err => console.error('Telegram xatosi:', err));

        await sendEmailAlert(lead, percentage, finalLevel);

        // Frontend ga javob
        res.json({
            score,
            percentage,
            level: finalLevel,
            recommendation,
            performanceNote,
            nextLevel,
            // Eski fieldlar (backward compat)
            grammarScore,
            vocabularyScore,
            mistakeScore,
            sentenceScore,
            readingScore,
            listeningScore,
            writingScore,
            essayScore,
            // Yangi fieldlar
            totalCorrect,
            totalAnswered,
            sectionSummary,
            wrongAnswers,
            writingText,
            essayText
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};