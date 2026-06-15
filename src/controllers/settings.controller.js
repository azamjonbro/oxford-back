const { Setting } = require('../models');
const { clearResourceCache } = require('../middlewares/responseCache');
const telegramConfig = require('../services/telegramConfig.service');

exports.getSettings = async (req, res) => {
    try {
        const settings = await Setting.find();
        res.json(settings);
    } catch (err) {
        console.error('Get Settings Error:', err);
        res.status(500).json({ message: err.message });
    }
};

exports.updateSettingsBulk = async (req, res) => {
    try {
        const settings = req.body; // Expecting { key1: value1, key2: value2 }
        const promises = Object.entries(settings).map(([key, value]) => {
            return Setting.findOneAndUpdate(
                { key },
                { value },
                { upsert: true, new: true }
            );
        });
        await Promise.all(promises);

        // Invalidate cache
        clearResourceCache('settings');
        telegramConfig.clearCache();

        res.json({ message: 'Settings updated' });
    } catch (err) {
        console.error('Bulk Update Error:', err);
        res.status(400).json({ message: err.message });
    }
};
