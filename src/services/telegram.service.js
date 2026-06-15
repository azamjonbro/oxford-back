const telegramConfig = require('./telegramConfig.service');
const proxyManager = require('./proxyManager.service');
const https = require('https');
const http = require('http');

function escapeHtml(unsafe) {
    if (unsafe === undefined || unsafe === null) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

/**
 * Send a Telegram API request via SOCKS5 proxy with auto-retry/rotation
 */
async function sendTelegramRequest(botToken, chatId, messageHTML, retryCount = 0) {
    const MAX_RETRIES = 2;
    const baseUrl = await telegramConfig.getApiUrl();

    return new Promise(async (resolve) => {
        if (!botToken || !chatId) {
            console.warn(`[Telegram API Client] Cannot send request: Missing botToken (${!!botToken}) or chatId (${chatId})`);
            return resolve(false);
        }

        const postData = JSON.stringify({
            chat_id: chatId,
            text: messageHTML,
            parse_mode: 'HTML'
        });

        const url = `${baseUrl.replace(/\/$/, '')}/bot${botToken}/sendMessage`;
        const parsedUrl = new URL(url);

        let agent = null;
        try {
            agent = await proxyManager.getAgent();
        } catch (err) {
            console.error('[Telegram API Client] Failed to get proxy agent:', err.message);
        }

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            family: 4,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 15000
        };

        // Attach SOCKS5 proxy agent if available
        if (agent) {
            options.agent = agent;
        }

        const proxyInfo = proxyManager.getCurrentProxyUrl();
        console.log(`[Telegram API Client] Sending to Chat ID: ${chatId} via proxy: ${proxyInfo}`);

        const httpModule = parsedUrl.protocol === 'https:' ? https : http;

        const req = httpModule.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`[Telegram API Client] ✅ Success: Message sent to Chat ID: ${chatId} via ${proxyInfo}`);
                    resolve(true);
                } else {
                    console.error(`[Telegram API Client] ❌ Telegram API error (Status: ${res.statusCode}):`, body);
                    resolve(false);
                }
            });
        });

        req.on('timeout', async () => {
            req.destroy();
            console.error(`[Telegram API Client] ⏱️ Request timeout for Chat ID: ${chatId} via ${proxyInfo}`);

            if (retryCount < MAX_RETRIES) {
                console.log(`[Telegram API Client] 🔄 Rotating proxy and retrying (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
                await proxyManager.markCurrentFailed();
                const result = await sendTelegramRequest(botToken, chatId, messageHTML, retryCount + 1);
                resolve(result);
            } else {
                console.error(`[Telegram API Client] ❌ All ${MAX_RETRIES} retries exhausted. Giving up.`);
                resolve(false);
            }
        });

        req.on('error', async (err) => {
            console.error(`[Telegram API Client] ❌ Network error to Chat ID ${chatId} via ${proxyInfo}:`, err.message);

            if (retryCount < MAX_RETRIES) {
                console.log(`[Telegram API Client] 🔄 Rotating proxy and retrying (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
                await proxyManager.markCurrentFailed();
                const result = await sendTelegramRequest(botToken, chatId, messageHTML, retryCount + 1);
                resolve(result);
            } else {
                console.error(`[Telegram API Client] ❌ All ${MAX_RETRIES} retries exhausted. Giving up.`);
                resolve(false);
            }
        });

        req.write(postData);
        req.end();
    });
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

        if (!botToken) {
            console.warn('[Telegram Service] Lead notification skipped: Bot token is not configured.');
            return false;
        }
        if (!adminId) {
            console.warn('[Telegram Service] Lead notification skipped: Admin ID is not configured.');
            return false;
        }

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

// 2. Test Result Notifications → Admin ID only (channel commented out)
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

        if (!botToken) {
            console.warn('[Telegram Service] Test result notification skipped: Bot token is not configured.');
            return false;
        }

        const {
            fullname, phone, score, level, status, warnings,
            writingText, essayText, speakingText, ip, deviceInfo, rawResultJson
        } = testResultData;

        // A. Channel Message (Public) - COMMENTED OUT AS REQUESTED
        /*
        const channelId = await telegramConfig.getChannelId();
        if (channelId) {
            const channelMsg = `━━━━━━━━━━━━━━━━━━
🔔 <b>TEST RESULT COMPLETION</b>

👤 <b>Name:</b> ${escapeHtml(fullname)}
📞 <b>Phone:</b> ${escapeHtml(phone)}
📊 <b>Score:</b> ${score}%
🎓 <b>Level:</b> ${escapeHtml(level)}
🚦 <b>Status:</b> ${escapeHtml(status)}
⚠️ <b>Warnings:</b> ${escapeHtml(String(warnings))}
━━━━━━━━━━━━━━━━━━`;
            await sendTelegramRequest(botToken, channelId, channelMsg);
        }
        */

        // B. Admin Message (Private)
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
        } else {
            console.log('[Telegram Service] Skipping admin notification: telegram_admin_id is empty.');
        }

        return true;
    } catch (err) {
        console.error('[Telegram Service] Exception in sendTestResultNotifications:', err);
        return false;
    }
};

// 3. Backward Compatibility Handlers
exports.sendChannelMessage = async (messageHTML) => {
    try {
        if (!(await telegramConfig.isTelegramEnabled())) {
            console.log('[Telegram Service] sendChannelMessage skipped: Telegram is disabled.');
            return false;
        }
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
        if (!(await telegramConfig.isTelegramEnabled())) {
            console.log('[Telegram Service] sendAdminMessage skipped: Telegram is disabled.');
            return false;
        }
        const botToken = await telegramConfig.getBotToken();
        const adminId = await telegramConfig.getAdminId();
        return await sendTelegramRequest(botToken, adminId, messageHTML);
    } catch (err) {
        console.error('[Telegram Service] Exception in sendAdminMessage:', err);
        return false;
    }
};
