const telegramConfig = require('./telegramConfig.service');
const proxyManager = require('./proxyManager.service');
const { SocksProxyAgent } = require('socks-proxy-agent');

function escapeHtml(unsafe) {
    if (unsafe === undefined || unsafe === null) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

async function sendTelegramRequest(botToken, chatId, messageHTML, retryCount = 0) {
    const MAX_RETRIES = 2;

    if (!botToken || !chatId) {
        console.warn(`[Telegram API Client] Cannot send request: Missing botToken (${!!botToken}) or chatId (${chatId})`);
        return false;
    }

    const proxyUrl = process.env.SOCKS5_PROXY;
    const proxyInfo = proxyUrl || 'none';

    try {
        const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

        const agent = proxyUrl ? new SocksProxyAgent(proxyUrl) : undefined;

        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

        console.log(`[Telegram API Client] Sending to Chat ID: ${chatId} via proxy: ${proxyInfo}`);

        const response = await fetch(url, {
            method: 'POST',
            agent,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: messageHTML,
                parse_mode: 'HTML'
            }),
            timeout: 15000
        });

        const data = await response.json();

        if (response.ok && data.ok) {
            console.log(`[Telegram API Client] ✅ Success: Message sent to Chat ID: ${chatId}`);
            return true;
        } else {
            console.error(`[Telegram API Client] ❌ Telegram API error:`, data);
            return false;
        }
    } catch (err) {
        console.error(`[Telegram API Client] ❌ Network error to Chat ID ${chatId}:`, err.message);

        if (retryCount < MAX_RETRIES) {
            console.log(`[Telegram API Client] 🔄 Retrying (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
            await new Promise(r => setTimeout(r, 1000));
            return sendTelegramRequest(botToken, chatId, messageHTML, retryCount + 1);
        }

        console.error(`[Telegram API Client] ❌ All ${MAX_RETRIES} retries exhausted. Giving up.`);
        return false;
    }
}

// 1. Lead Notification → Admin ID
exports.sendLeadNotification = async (leadData) => {
    try {
        if (!(await telegramConfig.isTelegramEnabled())) {
            console.log('[Telegram Service] Lead notification skipped: Telegram system is disabled globally.');
            return false;
        }
        if (!(await telegramConfig.isLeadNotificationEnabled())) {
            console.log('[Telegram Service] Lead notification skipped: Lead notifications are disabled in settings.');
            return false;
        }

        const botToken = await telegramConfig.getBotToken();
        const adminId = await telegramConfig.getAdminId();

        if (!botToken) { console.warn('[Telegram Service] Bot token is not configured.'); return false; }
        if (!adminId) { console.warn('[Telegram Service] Admin ID is not configured.'); return false; }

        const { formType, fullname, phone, createdAt, extraFields } = leadData;

        const messageHTML = `━━━━━━━━━━━━━━━━━━
📥 <b>NEW LEAD</b>

📌 <b>Type:</b> ${escapeHtml(formType)}

👤 <b>Name:</b> ${escapeHtml(fullname)}
📞 <b>Phone:</b> ${escapeHtml(phone)}

📅 <b>Date:</b> ${escapeHtml(createdAt)}

ℹ️ <b>Info:</b>
${escapeHtml(extraFields)}
━━━━━━━━━━━━━━━━━━`;

        return await sendTelegramRequest(botToken, adminId, messageHTML);
    } catch (err) {
        console.error('[Telegram Service] Exception in sendLeadNotification:', err);
        return false;
    }
};

// 2. Test Result Notifications
exports.sendTestResultNotifications = async (testResultData) => {
    try {
        if (!(await telegramConfig.isTelegramEnabled())) {
            console.log('[Telegram Service] Test result notification skipped: Telegram system is disabled globally.');
            return false;
        }
        if (!(await telegramConfig.isTestResultEnabled())) {
            console.log('[Telegram Service] Test result notification skipped: Test result notifications are disabled.');
            return false;
        }

        const botToken = await telegramConfig.getBotToken();
        const adminId = await telegramConfig.getAdminId();

        if (!botToken) { console.warn('[Telegram Service] Bot token is not configured.'); return false; }

        const {
            fullname, phone, score, level, status, warnings,
            writingText, essayText, speakingText, ip, deviceInfo, rawResultJson
        } = testResultData;

        if (adminId) {
            const rawJsonStr = JSON.stringify(rawResultJson, null, 2);
            const escapedJson = escapeHtml(rawJsonStr);
            const truncatedJson = escapedJson.length > 2000 ? escapedJson.substring(0, 2000) + '\n... [TRUNCATED]' : escapedJson;

            const adminMsg = `━━━━━━━━━━━━━━━━━━
👤 <b>TEST RESULT DETAILS (ADMIN)</b>

👤 <b>Name:</b> ${escapeHtml(fullname)}
📞 <b>Phone:</b> ${escapeHtml(phone)}

📝 <b>Writing Text:</b>
${escapeHtml(writingText) || 'None'}

📝 <b>Essay Text:</b>
${escapeHtml(essayText) || 'None'}

🗣️ <b>Speaking Text:</b>
${escapeHtml(speakingText) || 'None'}

🌐 <b>IP Address:</b> ${escapeHtml(ip)}
📱 <b>Device Info:</b> ${escapeHtml(deviceInfo)}

⚙️ <b>Raw Result JSON:</b>
<pre>${truncatedJson}</pre>
━━━━━━━━━━━━━━━━━━`;

            await sendTelegramRequest(botToken, adminId, adminMsg);
        }

        return true;
    } catch (err) {
        console.error('[Telegram Service] Exception in sendTestResultNotifications:', err);
        return false;
    }
};

// 3. Backward Compatibility
exports.sendChannelMessage = async (messageHTML) => {
    try {
        if (!(await telegramConfig.isTelegramEnabled())) return false;
        const botToken = await telegramConfig.getBotToken();
        const channelId = await telegramConfig.getChannelId();
        return await sendTelegramRequest(botToken, channelId, messageHTML);
    } catch (err) {
        console.error('[Telegram Service] Exception in sendChannelMessage:', err);
        return false;
    }
};

exports.sendAdminMessage = async (messageHTML) => {
    try {
        if (!(await telegramConfig.isTelegramEnabled())) return false;
        const botToken = await telegramConfig.getBotToken();
        const adminId = await telegramConfig.getAdminId();
        return await sendTelegramRequest(botToken, adminId, messageHTML);
    } catch (err) {
        console.error('[Telegram Service] Exception in sendAdminMessage:', err);
        return false;
    }
};