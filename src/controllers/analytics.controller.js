const Analytics = require('../models/Analytics');

exports.getStats = async (req, res) => {
    try {
        const totalVisits = await Analytics.countDocuments();
        const deviceStats = await Analytics.aggregate([
            { $group: { _id: "$device", count: { $sum: 1 } } }
        ]);
        
        const recentVisits = await Analytics.find().sort({ timestamp: -1 }).limit(10);
        
        res.json({
            totalVisits,
            deviceStats,
            recentVisits
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
