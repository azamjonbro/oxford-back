const { Setting } = require('../models');
const https = require('https');

async function getTelegramSettings() {
    const token = await Setting.findOne({ key: 'telegramBotToken' });
    const channelId = await Setting.findOne({ key: 'telegramChannelId' });
    const adminId = await Setting.findOne({ key: 'telegramAdminId' });
    return {
        botToken: token?.value,
        channelId: channelId?.value,
        adminId: adminId?.value
    };
}

function sendTelegramRequest(botToken, chatId, messageHTML) {
    return new Promise((resolve, reject) => {
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

exports.sendChannelMessage = async (messageHTML) => {
    try {
        const { botToken, channelId } = await getTelegramSettings();
        return await sendTelegramRequest(botToken, channelId, messageHTML);
    } catch (err) {
        console.error('Failed to send to Telegram Channel:', err.message);
        return false;
    }
};

exports.sendAdminMessage = async (messageHTML) => {
    try {
        const { botToken, adminId } = await getTelegramSettings();
        return await sendTelegramRequest(botToken, adminId, messageHTML);
    } catch (err) {
        console.error('Failed to send to Telegram Admin:', err.message);
        return false;
    }
};
