const { Setting } = require('../models');

// Cache config for 2 minutes (120,000 ms)
const CACHE_TTL = 120 * 1000;
let cache = null;
let lastFetchTime = 0;

function parseBool(value) {
    if (value === undefined || value === null) return false;
    if (typeof value === 'boolean') return value;
    return String(value).toLowerCase() === 'true';
}

async function fetchConfig() {
    const now = Date.now();
    if (cache && (now - lastFetchTime < CACHE_TTL)) {
        return cache;
    }

    try {
        const settings = await Setting.find({
            key: {
                $in: [
                    'telegram_bot_token',
                    'telegram_channel_id',
                    'telegram_admin_id',
                    'telegram_enabled',
                    'telegram_leads_enabled',
                    'telegram_test_results_enabled'
                ]
            }
        });

        const config = {
            telegram_bot_token: '',
            telegram_channel_id: '',
            telegram_admin_id: '',
            telegram_enabled: false,
            telegram_leads_enabled: false,
            telegram_test_results_enabled: false
        };

        settings.forEach(s => {
            const key = s.key;
            const val = s.value;
            if (key === 'telegram_enabled' || key === 'telegram_leads_enabled' || key === 'telegram_test_results_enabled') {
                config[key] = parseBool(val);
            } else {
                config[key] = (val !== undefined && val !== null) ? String(val) : '';
            }
        });

        cache = config;
        lastFetchTime = now;
        return cache;
    } catch (err) {
        console.error('Error fetching Telegram settings from DB:', err);
        // Fallback to cache or empty defaults on DB error to prevent crash
        return cache || {
            telegram_bot_token: '',
            telegram_channel_id: '',
            telegram_admin_id: '',
            telegram_enabled: false,
            telegram_leads_enabled: false,
            telegram_test_results_enabled: false
        };
    }
}

const getTelegramConfig = async () => {
    return await fetchConfig();
};

const getBotToken = async () => {
    const config = await fetchConfig();
    return config.telegram_bot_token;
};

const getChannelId = async () => {
    const config = await fetchConfig();
    return config.telegram_channel_id;
};

const getAdminId = async () => {
    const config = await fetchConfig();
    return config.telegram_admin_id;
};

const isTelegramEnabled = async () => {
    const config = await fetchConfig();
    return config.telegram_enabled;
};

const isLeadNotificationEnabled = async () => {
    const config = await fetchConfig();
    return config.telegram_leads_enabled;
};

const isTestResultEnabled = async () => {
    const config = await fetchConfig();
    return config.telegram_test_results_enabled;
};

const clearCache = () => {
    cache = null;
    lastFetchTime = 0;
};

module.exports = {
    getTelegramConfig,
    getBotToken,
    getChannelId,
    getAdminId,
    isTelegramEnabled,
    isLeadNotificationEnabled,
    isTestResultEnabled,
    clearCache
};
