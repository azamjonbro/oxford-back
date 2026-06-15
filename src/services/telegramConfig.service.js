const { Setting } = require('../models');

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
    if (cache && (now - lastFetchTime < CACHE_TTL)) return cache;

    try {
        const settings = await Setting.find({
            key: {
                $in: [
                    'telegram_bot_token',
                    'telegram_channel_id',
                    'telegram_channel_enabled',
                    'telegram_admin_id',
                    'telegram_admin_ids',
                    'telegram_enabled',
                    'telegram_leads_enabled',
                    'telegram_test_results_enabled',
                    'telegram_api_url'
                ]
            }
        });

        const config = {
            telegram_bot_token: '',
            telegram_channel_id: '',
            telegram_channel_enabled: false,
            telegram_admin_id: '',
            telegram_admin_ids: '',
            telegram_enabled: false,
            telegram_leads_enabled: false,
            telegram_test_results_enabled: false,
            telegram_api_url: 'https://api.telegram.org'
        };

        settings.forEach(s => {
            const key = s.key;
            const val = s.value;
            if (['telegram_enabled', 'telegram_leads_enabled', 'telegram_test_results_enabled', 'telegram_channel_enabled'].includes(key)) {
                config[key] = parseBool(val);
            } else {
                config[key] = (val !== undefined && val !== null) ? String(val) : '';
            }
        });

        if (!config.telegram_api_url) config.telegram_api_url = 'https://api.telegram.org';

        cache = config;
        lastFetchTime = now;
        return cache;
    } catch (err) {
        console.error('Error fetching Telegram settings from DB:', err);
        return cache || {
            telegram_bot_token: '',
            telegram_channel_id: '',
            telegram_channel_enabled: false,
            telegram_admin_id: '',
            telegram_admin_ids: '',
            telegram_enabled: false,
            telegram_leads_enabled: false,
            telegram_test_results_enabled: false,
            telegram_api_url: 'https://api.telegram.org'
        };
    }
}

const getTelegramConfig = async () => await fetchConfig();
const getBotToken = async () => (await fetchConfig()).telegram_bot_token;
const getChannelId = async () => (await fetchConfig()).telegram_channel_id;
const isChannelEnabled = async () => (await fetchConfig()).telegram_channel_enabled;
const isTelegramEnabled = async () => (await fetchConfig()).telegram_enabled;
const isLeadNotificationEnabled = async () => (await fetchConfig()).telegram_leads_enabled;
const isTestResultEnabled = async () => (await fetchConfig()).telegram_test_results_enabled;
const getApiUrl = async () => (await fetchConfig()).telegram_api_url || 'https://api.telegram.org';
const clearCache = () => { cache = null; lastFetchTime = 0; };

// Barcha admin ID larni array qaytaradi
const getAdminIds = async () => {
    const config = await fetchConfig();

    const ids = new Set();

    // Eski yagona admin
    if (config.telegram_admin_id) ids.add(config.telegram_admin_id.trim());

    // Yangi bir nechta adminlar (vergul bilan ajratilgan)
    if (config.telegram_admin_ids) {
        config.telegram_admin_ids.split(',')
            .map(id => id.trim())
            .filter(id => id.length > 0)
            .forEach(id => ids.add(id));
    }

    return [...ids];
};

// Backward compat
const getAdminId = async () => {
    const ids = await getAdminIds();
    return ids[0] || '';
};

module.exports = {
    getTelegramConfig,
    getBotToken,
    getChannelId,
    isChannelEnabled,
    getAdminId,
    getAdminIds,
    isTelegramEnabled,
    isLeadNotificationEnabled,
    isTestResultEnabled,
    getApiUrl,
    clearCache
};