const { Lead, TestResult, Question, Branch } = require('../models');

// Fetch and page student leads with advanced filters
exports.getLeads = async (req, res) => {
    try {
        const { search, level, status, branch, page = 1, limit = 15 } = req.query;
        const query = {};

        // 1. Search filter (Name or Phone)
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        // 2. Status filter
        if (status) {
            query.status = status;
        }

        // 3. Branch filter
        if (branch) {
            query.branch = branch;
        }

        // 4. Level filter (query from associated TestResult)
        let leadIdsFilter = null;
        if (level) {
            const results = await TestResult.find({ level, completionStatus: 'completed' }, 'lead');
            leadIdsFilter = results.map(r => r.lead);
            query._id = { $in: leadIdsFilter };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Lead.countDocuments(query);

        const leads = await Lead.find(query)
            .populate('branch')
            .populate('testResult')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            leads,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

// Update lead status
exports.updateLeadStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['New', 'Contacted', 'Registered', 'Rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const lead = await Lead.findByIdAndUpdate(id, { status }, { new: true }).populate('branch').populate('testResult');
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        res.json(lead);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

// Delete a Lead and its test results
exports.deleteLead = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await Lead.findById(id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        // Delete associated test result
        if (lead.testResult) {
            await TestResult.findByIdAndDelete(lead.testResult);
        }

        await Lead.findByIdAndDelete(id);
        res.json({ message: 'Lead and associated test result deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

// Export all leads to CSV
exports.exportLeadsCSV = async (req, res) => {
    try {
        const leads = await Lead.find()
            .populate('branch')
            .populate('testResult')
            .sort({ createdAt: -1 });

        // CSV Header
        let csv = 'Name,Phone,Age,Telegram,Branch,Status,Completion Status,Score,English Level,Date\r\n';

        leads.forEach(lead => {
            const name = `"${lead.name.replace(/"/g, '""')}"`;
            const phone = `"${lead.phone.replace(/"/g, '""')}"`;
            const age = lead.age;
            const telegram = lead.telegram ? `"${lead.telegram.replace(/"/g, '""')}"` : 'N/A';
            const branch = lead.branch ? `"${(lead.branch.name?.en || 'N/A').replace(/"/g, '""')}"` : 'N/A';
            const status = lead.status;
            const compStatus = lead.testResult ? lead.testResult.completionStatus : 'Not started';
            const score = lead.testResult ? `${lead.testResult.score}%` : 'N/A';
            const level = lead.testResult ? lead.testResult.level : 'N/A';
            const date = new Date(lead.createdAt).toLocaleString();

            csv += `${name},${phone},${age},${telegram},${branch},${status},${compStatus},${score},${level},${date}\r\n`;
        });

        // Set Headers for file download (UTF-8 BOM prepended so Excel shows Cyrillic/special characters correctly)
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=oxford_placement_leads.csv');
        res.status(200).send('\ufeff' + csv);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

// Analytics Data for Admin Dashboard
exports.getAnalytics = async (req, res) => {
    try {
        const totalLeads = await Lead.countDocuments();
        const completedTests = await TestResult.countDocuments({ completionStatus: 'completed' });

        // Average score
        const avgScoreResult = await TestResult.aggregate([
            { $match: { completionStatus: 'completed' } },
            { $group: { _id: null, avgScore: { $avg: '$score' } } }
        ]);
        const avgScore = avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avgScore) : 0;

        // Level distribution
        const levelDistribution = await TestResult.aggregate([
            { $match: { completionStatus: 'completed' } },
            { $group: { _id: '$level', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Status conversion counters
        const statusCounts = await Lead.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const conversions = { New: 0, Contacted: 0, Registered: 0, Rejected: 0 };
        statusCounts.forEach(item => {
            if (conversions.hasOwnProperty(item._id)) {
                conversions[item._id] = item.count;
            }
        });

        // Daily Leads trend (last 14 days)
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 14);
        const dailyTrend = await Lead.aggregate([
            { $match: { createdAt: { $gte: dateLimit } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    leads: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Most Failed Questions:
        // We look at completed tests, unwind answers, filter incorrect answers (isCorrect = false),
        // group by questionId, count, and sort descending
        const failedQuestions = await TestResult.aggregate([
            { $match: { completionStatus: 'completed' } },
            { $unwind: '$answers' },
            { $match: { 'answers.isCorrect': false } },
            { $group: { _id: '$answers.questionId', failCount: { $sum: 1 } } },
            { $sort: { failCount: -1 } },
            { $limit: 5 }
        ]);

        // Populate question details
        const populatedFailedQuestions = [];
        for (const item of failedQuestions) {
            const q = await Question.findById(item._id);
            if (q) {
                populatedFailedQuestions.push({
                    questionId: item._id,
                    text: q.text,
                    category: q.category,
                    section: q.section,
                    failCount: item.failCount
                });
            }
        }

        res.json({
            summary: {
                totalLeads,
                completedTests,
                avgScore
            },
            levelDistribution,
            conversions,
            dailyTrend,
            failedQuestions: populatedFailedQuestions
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

// Admin manually grades Writing, Essay, and Speaking scores
exports.gradeStudentTest = async (req, res) => {
    try {
        const { id } = req.params;
        const { writingScore, essayScore, speakingScore } = req.body;

        const lead = await Lead.findById(id).populate('testResult');
        if (!lead) return res.status(404).json({ message: 'Lead not found' });
        if (!lead.testResult) return res.status(404).json({ message: 'No test result found for this candidate' });

        const testResult = lead.testResult;

        if (typeof writingScore === 'number') {
            testResult.writingScore = Math.min(Math.max(writingScore, 0), 10);
            testResult.writingGraded = true;
        }
        if (typeof essayScore === 'number') {
            testResult.essayScore = Math.min(Math.max(essayScore, 0), 10);
            testResult.essayGraded = true;
        }
        if (typeof speakingScore === 'number') {
            testResult.speakingScore = Math.min(Math.max(speakingScore, 0), 10);
            testResult.speakingGraded = true;
        }

        // Recalculate total score (Grammar + Vocabulary + Mistake + Sentence + Reading + Listening + Writing + Essay)
        const totalScore = testResult.grammarScore + testResult.vocabularyScore + testResult.mistakeScore + testResult.sentenceScore + testResult.readingScore + testResult.listeningScore + testResult.writingScore + testResult.essayScore;
        testResult.score = totalScore;

        // Determine Level based on new score
        const defaultRanges = [
            { name: 'Beginner', min: 0, max: 20, recommendation: 'We recommend starting from the basics to build a strong foundation.' },
            { name: 'Elementary', min: 21, max: 40, recommendation: 'You have basic communication skills. Let\'s boost your speaking and grammar!' },
            { name: 'Pre-Intermediate', min: 41, max: 60, recommendation: 'Great progress! You can understand familiar topics. Let\'s aim for intermediate fluency.' },
            { name: 'Intermediate', min: 61, max: 75, recommendation: 'Excellent! You can express yourself in various contexts. Let\'s refine your advanced skills.' },
            { name: 'Upper-Intermediate', min: 76, max: 88, recommendation: 'Impressive score! You are very close to high fluency. Let\'s prepare for IELTS or business English.' },
            { name: 'IELTS Foundation', min: 89, max: 100, recommendation: 'Outstanding! You possess advanced English skills. You are fully ready for intensive IELTS prep!' }
        ];

        let levelRanges = defaultRanges;
        const { Setting } = require('../models');
        const levelsSetting = await Setting.findOne({ key: 'placement_test_levels' });
        if (levelsSetting && levelsSetting.value) {
            try {
                levelRanges = JSON.parse(levelsSetting.value);
            } catch (e) {}
        }

        let studentLevel = 'Beginner';
        for (const range of levelRanges) {
            if (totalScore >= range.min && totalScore <= range.max) {
                studentLevel = range.name;
                break;
            }
        }

        testResult.level = studentLevel;
        await testResult.save();

        // Populate and return lead
        const updatedLead = await Lead.findById(id).populate('branch').populate('testResult');
        res.json(updatedLead);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

// Admin assigns student to a group based on test score
exports.assignGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const { groupName, branch } = req.body;

        if (!groupName || typeof groupName !== 'string' || !groupName.trim()) {
            return res.status(400).json({ message: 'Group name is required.' });
        }

        const updateData = {
            assignedGroup: groupName.trim(),
            assignedAt: new Date(),
            status: 'Registered' // Auto-set status to Registered when assigned
        };

        // Optionally update branch assignment too
        if (branch) {
            updateData.branch = branch;
        }

        const lead = await Lead.findByIdAndUpdate(id, updateData, { new: true })
            .populate('branch')
            .populate('testResult');

        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        res.json(lead);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};
