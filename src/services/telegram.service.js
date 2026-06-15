const telegramConfig = require('./telegramConfig.service');
const https = require('https');

function escapeHtml(unsafe) {
    if (unsafe === undefined || unsafe === null) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function sendTelegramRequest(botToken, chatId, messageHTML) {
    return new Promise((resolve) => {
        if (!botToken || !chatId) {
            return resolve(false); // Settings not configured
        }

        const postData = JSON.stringify({
            chat_id: chatId,
            text: messageHTML,
            parse_mode: 'HTML'
        });

        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
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
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(true);
                } else {
                    console.error('Telegram API Error:', body);
                    resolve(false);
                }
            });
        });

        req.on('error', (err) => {
            console.error('Telegram request error:', err.message);
            resolve(false);
        });

        req.write(postData);
        req.end();
    });
}

// 1. Specific Lead Notification Handler
exports.sendLeadNotification = async (leadData) => {
    try {
        if (!(await telegramConfig.isTelegramEnabled()) || !(await telegramConfig.isLeadNotificationEnabled())) {
            return false;
        }

        const botToken = await telegramConfig.getBotToken();
        const channelId = await telegramConfig.getChannelId();

        if (!botToken || !channelId) return false;

        const { formType, fullname, phone, createdAt, extraFields } = leadData;

        const escapedType = escapeHtml(formType);
        const escapedName = escapeHtml(fullname);
        const escapedPhone = escapeHtml(phone);
        const escapedDate = escapeHtml(createdAt);
        const escapedExtra = escapeHtml(extraFields);

        const messageHTML = `━━━━━━━━━━━━━━━━━━
📥 <b>NEW LEAD</b>

📌 <b>Type:</b> ${escapedType}

👤 <b>Name:</b> ${escapedName}
📞 <b>Phone:</b> ${escapedPhone}

📅 <b>Date:</b> ${escapedDate}

ℹ️ <b>Info:</b>
${escapedExtra}
━━━━━━━━━━━━━━━━━━`;

        return await sendTelegramRequest(botToken, channelId, messageHTML);
    } catch (err) {
        console.error('Failed to send Lead Notification:', err.message);
        return false;
    }
};

// 2. Specific Test Result Notifications Handler
exports.sendTestResultNotifications = async (testResultData) => {
    try {
        if (!(await telegramConfig.isTelegramEnabled()) || !(await telegramConfig.isTestResultEnabled())) {
            return false;
        }

        const botToken = await telegramConfig.getBotToken();
        const channelId = await telegramConfig.getChannelId();
        const adminId = await telegramConfig.getAdminId();

        if (!botToken) return false;

        const {
            fullname,
            phone,
            score,
            level,
            status,
            warnings,
            writingText,
            essayText,
            speakingText,
            ip,
            deviceInfo,
            rawResultJson
        } = testResultData;

        // A. Channel Message (Public)
        if (channelId) {
            const escapedName = escapeHtml(fullname);
            const escapedPhone = escapeHtml(phone);
            const escapedLevel = escapeHtml(level);
            const escapedStatus = escapeHtml(status);
            const escapedWarnings = escapeHtml(String(warnings));

            const channelMsg = `━━━━━━━━━━━━━━━━━━
🔔 <b>TEST RESULT COMPLETION</b>

👤 <b>Name:</b> ${escapedName}
📞 <b>Phone:</b> ${escapedPhone}
📊 <b>Score:</b> ${score}%
🎓 <b>Level:</b> ${escapedLevel}
🚦 <b>Status:</b> ${escapedStatus}
⚠️ <b>Warnings:</b> ${escapedWarnings}
━━━━━━━━━━━━━━━━━━`;

            await sendTelegramRequest(botToken, channelId, channelMsg);
        }

        // B. Admin Message (Private)
        if (adminId) {
            const escapedName = escapeHtml(fullname);
            const escapedPhone = escapeHtml(phone);
            const escapedWriting = escapeHtml(writingText);
            const escapedEssay = escapeHtml(essayText);
            const escapedSpeaking = escapeHtml(speakingText);
            const escapedIp = escapeHtml(ip);
            const escapedDevice = escapeHtml(deviceInfo);

            const rawJsonStr = JSON.stringify(rawResultJson, null, 2);
            const escapedJson = escapeHtml(rawJsonStr);
            const truncatedJson = escapedJson.length > 2000 ? escapedJson.substring(0, 2000) + '\n... [TRUNCATED]' : escapedJson;

            const adminMsg = `━━━━━━━━━━━━━━━━━━
👤 <b>TEST RESULT DETAILS (ADMIN)</b>

👤 <b>Name:</b> ${escapedName}
📞 <b>Phone:</b> ${escapedPhone}

📝 <b>Writing Text:</b>
${escapedWriting || 'None'}

📝 <b>Essay Text:</b>
${escapedEssay || 'None'}

🗣️ <b>Speaking Text:</b>
${escapedSpeaking || 'None'}

🌐 <b>IP Address:</b> ${escapedIp}
📱 <b>Device Info:</b> ${escapedDevice}

⚙️ <b>Raw Result JSON:</b>
<pre>${truncatedJson}</pre>
━━━━━━━━━━━━━━━━━━`;

            await sendTelegramRequest(botToken, adminId, adminMsg);
        }

        return true;
    } catch (err) {
        console.error('Failed to send Test Result Notifications:', err.message);
        return false;
    }
};

// 3. Backward Compatibility Handlers
exports.sendChannelMessage = async (messageHTML) => {
    try {
        if (!(await telegramConfig.isTelegramEnabled())) return false;
        const botToken = await telegramConfig.getBotToken();
        const channelId = await telegramConfig.getChannelId();
        return await sendTelegramRequest(botToken, channelId, messageHTML);
    } catch (err) {
        console.error('Failed to send to Telegram Channel:', err.message);
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
        console.error('Failed to send to Telegram Admin:', err.message);
        return false;
    }
};
