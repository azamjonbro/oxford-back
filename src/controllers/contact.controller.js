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

        // 2. Format and send Lead notification
        let additionalInfoStr = '';
        if (course) additionalInfoStr += `Course: ${course}\n`;
        if (time) additionalInfoStr += `Preferred Time: ${time}\n`;
        for (const [k, v] of Object.entries(otherInfo)) {
            if (v) additionalInfoStr += `${k}: ${v}\n`;
        }

        const extraFields = `${message ? `Message: ${message}\n` : ''}${additionalInfoStr || 'None'}`;
        
        telegramService.sendLeadNotification({
            formType: formType || 'Contact Form',
            fullname: name || 'N/A',
            phone: phone || 'N/A',
            createdAt: new Date().toLocaleString('en-GB'),
            extraFields: extraFields.trim()
        }).catch(err => console.error("Telegram lead notify error:", err));

        res.status(201).json({ message: 'Form submitted successfully', data: newMessage });
    } catch (err) {
        console.error('Contact Form Error:', err);
        // User flow shouldn't be blocked, but if saving fails, return 500
        res.status(500).json({ message: err.message });
    }
};
