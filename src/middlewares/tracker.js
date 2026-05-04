const Analytics = require('../models/Analytics');

const tracker = async (req, res, next) => {
    // Only track GET requests to public paths or explicit tracking calls
    if (req.method === 'GET' && !req.path.includes('/admin')) {
        try {
            const ua = req.get('User-Agent');
            const visitor = new Analytics({
                ip: req.ip,
                userAgent: ua,
                path: req.path,
                referer: req.get('Referer'),
                device: ua.includes('Mobile') ? 'Mobile' : 'Desktop'
                // Demographics like age/gender usually come from 3rd party or session
            });
            await visitor.save();
        } catch (err) {
            console.error('Analytics Error:', err);
        }
    }
    next();
};

module.exports = tracker;
