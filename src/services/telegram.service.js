const telegramConfig = require('./telegramConfig.service');
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

function getStaticProxies() {
    const proxies = [];
    if (process.env.SOCKS5_PROXY) proxies.push(process.env.SOCKS5_PROXY);
    let i = 2;
    while (process.env[`SOCKS5_PROXY_${i}`]) {
        proxies.push(process.env[`SOCKS5_PROXY_${i}`]);
        i++;
    }
    return proxies;
}

let proxyIndex = 0;

function rotateProxy() {
    const proxies = getStaticProxies();
    if (proxies.length === 0) return;
    proxyIndex = (proxyIndex + 1) % proxies.length;
    console.log(`[ProxyManager] 🔄 Proxy almashtirildi [${proxyIndex + 1}/${proxies.length}]: ${proxies[proxyIndex]}`);
}

async function sendTelegramRequest(botToken, chatId, messageHTML, retryCount = 0) {
    const MAX_RETRIES = getStaticProxies().length || 2;

    if (!botToken || !chatId) {
        console.warn(`[Telegram API Client] botToken yoki chatId yo'q`);
        return false;
    }

    const proxies = getStaticProxies();
    const proxyUrl = proxies.length > 0 ? proxies[proxyIndex % proxies.length] : null;
    const proxyInfo = proxyUrl || 'none';

    try {
        const { default: fetch } = await import('node-fetch');
        const agent = proxyUrl ? new SocksProxyAgent(proxyUrl) : undefined;
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

        console.log(`[Telegram API Client] Chat ID ga yuborilmoqda: ${chatId} | Proxy: ${proxyInfo}`);

        const response = await fetch(url, {
            method: 'POST',
            agent,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: messageHTML, parse_mode: 'HTML' }),
            timeout: 15000
        });

        const data = await response.json();

        if (response.ok && data.ok) {
            console.log(`[Telegram API Client] ✅ Muvaffaqiyatli: Chat ID ${chatId} ga yuborildi`);
            return true;
        } else {
            console.error(`[Telegram API Client] ❌ Telegram API xatosi:`, data);
            return false;
        }
    } catch (err) {
        console.error(`[Telegram API Client] ❌ Tarmoq xatosi (Chat ID ${chatId}):`, err.message);

        if (retryCount < MAX_RETRIES) {
            rotateProxy();
            console.log(`[Telegram API Client] 🔄 Qayta urinilmoqda (${retryCount + 1}/${MAX_RETRIES})...`);
            await new Promise(r => setTimeout(r, 1000));
            return sendTelegramRequest(botToken, chatId, messageHTML, retryCount + 1);
        }

        console.error(`[Telegram API Client] ❌ Barcha urinishlar tugadi.`);
        return false;
    }
}

async function sendToAllAdmins(botToken, messageHTML) {
    const adminIds = await telegramConfig.getAdminIds();
    if (adminIds.length === 0) {
        console.warn('[Telegram Service] Admin ID lar sozlanmagan.');
        return false;
    }
    const results = await Promise.all(
        adminIds.map(id => sendTelegramRequest(botToken, id, messageHTML))
    );
    return results.some(r => r === true);
}

// 1. Lead Notification
exports.sendLeadNotification = async (leadData) => {
    try {
        if (!(await telegramConfig.isTelegramEnabled())) {
            console.log('[Telegram Service] Lead bildirishnomasi o\'tkazib yuborildi: Telegram o\'chirilgan.');
            return false;
        }
        if (!(await telegramConfig.isLeadNotificationEnabled())) {
            console.log('[Telegram Service] Lead bildirishnomasi o\'tkazib yuborildi: Lead bildirisnomalar o\'chirilgan.');
            return false;
        }

        const botToken = await telegramConfig.getBotToken();
        if (!botToken) { console.warn('[Telegram Service] Bot token sozlanmagan.'); return false; }

        const { formType, fullname, phone, createdAt, extraFields } = leadData;

        const messageHTML = `━━━━━━━━━━━━━━━━━━
📥 <b>YANGI ARIZA</b>

📌 <b>Turi:</b> ${escapeHtml(formType)}
👤 <b>Ism:</b> ${escapeHtml(fullname)}
📞 <b>Telefon:</b> ${escapeHtml(phone)}
📅 <b>Sana:</b> ${escapeHtml(createdAt)}

ℹ️ <b>Qo'shimcha ma'lumot:</b>
${escapeHtml(extraFields)}
━━━━━━━━━━━━━━━━━━`;

        const channelEnabled = await telegramConfig.isChannelEnabled();
        const channelId = await telegramConfig.getChannelId();

        const promises = [];
        if (channelEnabled && channelId) {
            promises.push(sendTelegramRequest(botToken, channelId, messageHTML));
        }
        promises.push(sendToAllAdmins(botToken, messageHTML));

        const results = await Promise.all(promises);
        return results.some(r => r === true);
    } catch (err) {
        console.error('[Telegram Service] sendLeadNotification xatosi:', err);
        return false;
    }
};

// 2. Test natijasi bildirishnomasi
exports.sendTestResultNotifications = async (testResultData) => {
    try {
        if (!(await telegramConfig.isTelegramEnabled())) {
            console.log('[Telegram Service] Test natijasi bildirishnomasi o\'tkazib yuborildi: Telegram o\'chirilgan.');
            return false;
        }
        if (!(await telegramConfig.isTestResultEnabled())) {
            console.log('[Telegram Service] Test natijasi bildirishnomasi o\'tkazib yuborildi: O\'chirilgan.');
            return false;
        }

        const botToken = await telegramConfig.getBotToken();
        if (!botToken) { console.warn('[Telegram Service] Bot token sozlanmagan.'); return false; }

        const {
            fullname, phone, score, level, status, warnings,
            writingText, essayText, speakingText, ip, deviceInfo, rawResultJson
        } = testResultData;

        const rawJsonStr = JSON.stringify(rawResultJson, null, 2);
        const escapedJson = escapeHtml(rawJsonStr);
        const truncatedJson = escapedJson.length > 2000
            ? escapedJson.substring(0, 2000) + '\n... [QISQARTIRILDI]'
            : escapedJson;

        const adminMsg = `━━━━━━━━━━━━━━━━━━
📊 <b>TEST NATIJASI (ADMIN)</b>

👤 <b>Ism:</b> ${escapeHtml(fullname)}
📞 <b>Telefon:</b> ${escapeHtml(phone)}
🎯 <b>Ball:</b> ${escapeHtml(String(score))}%
🎓 <b>Daraja:</b> ${escapeHtml(level)}
🚦 <b>Holat:</b> ${escapeHtml(status)}
⚠️ <b>Ogohlantirishlar:</b> ${escapeHtml(String(warnings))}

📝 <b>Yozma matn:</b>
${escapeHtml(writingText) || 'Yo\'q'}

📝 <b>Esse matni:</b>
${escapeHtml(essayText) || 'Yo\'q'}

🗣️ <b>Og\'zaki matn:</b>
${escapeHtml(speakingText) || 'Yo\'q'}

🌐 <b>IP manzil:</b> ${escapeHtml(ip)}
📱 <b>Qurilma:</b> ${escapeHtml(deviceInfo)}

⚙️ <b>Natija JSON:</b>
<pre>${truncatedJson}</pre>
━━━━━━━━━━━━━━━━━━`;

        const channelEnabled = await telegramConfig.isChannelEnabled();
        const channelId = await telegramConfig.getChannelId();

        const promises = [];
        if (channelEnabled && channelId) {
            promises.push(sendTelegramRequest(botToken, channelId, adminMsg));
        }
        promises.push(sendToAllAdmins(botToken, adminMsg));

        const results = await Promise.all(promises);
        return results.some(r => r === true);
    } catch (err) {
        console.error('[Telegram Service] sendTestResultNotifications xatosi:', err);
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
        console.error('[Telegram Service] sendChannelMessage xatosi:', err);
        return false;
    }
};

exports.sendAdminMessage = async (messageHTML) => {
    try {
        if (!(await telegramConfig.isTelegramEnabled())) return false;
        const botToken = await telegramConfig.getBotToken();
        return await sendToAllAdmins(botToken, messageHTML);
    } catch (err) {
        console.error('[Telegram Service] sendAdminMessage xatosi:', err);
        return false;
    }
};