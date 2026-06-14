const { Message } = require('../models');
const telegramService = require('../services/telegram.service');

exports.submitContactForm = async (req, res) => {
    try {
        const { name, phone, message, course, time, formType, ...otherInfo } = req.body;
        
        // 1. Save to database
        const newMessage = new Message({
            name: name || 'Unknown',
            phone: phone || 'Unknown',
            text: message || `Course: ${course}, Time: ${time}`,
            status: 'new'
        });
        await newMessage.save();

        // 2. Format Telegram message
        let additionalInfoStr = '';
        if (course) additionalInfoStr += `Course: ${course}\n`;
        if (time) additionalInfoStr += `Preferred Time: ${time}\n`;
        for (const [k, v] of Object.entries(otherInfo)) {
            if (v) additionalInfoStr += `${k}: ${v}\n`;
        }

        const telegramHtml = `━━━━━━━━━━━━━━━━━━
📥 <b>NEW LEAD</b>

📌 <b>Form Type:</b>
${formType || 'Contact/Registration Form'}

👤 <b>Full Name:</b>
${name || 'N/A'}

📞 <b>Phone:</b>
${phone || 'N/A'}

📅 <b>Date:</b>
${new Date().toLocaleString('en-GB')}

ℹ️ <b>Additional Info:</b>
${message ? `Message: ${message}\n` : ''}${additionalInfoStr || 'None'}

🌐 <b>Source:</b>
Website
━━━━━━━━━━━━━━━━━━`;

        // 3. Send to Telegram Channel (async, we don't await blocking if it fails)
        telegramService.sendChannelMessage(telegramHtml).catch(err => console.error("Telegram send error:", err));

        res.status(201).json({ message: 'Form submitted successfully', data: newMessage });
    } catch (err) {
        console.error('Contact Form Error:', err);
        // User flow shouldn't be blocked, but if saving fails, return 500
        res.status(500).json({ message: err.message });
    }
};
