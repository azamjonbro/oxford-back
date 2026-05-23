const express = require('express');
const router = express.Router();
const genericController = require('../controllers/generic.controller');
const settingsController = require('../controllers/settings.controller');
const auth = require('../middlewares/auth');

const resourceMap = {
    'teachers': 'Teacher',
    'courses': 'Course',
    'events': 'Event',
    'benefits': 'Benefit',
    'faqs': 'Faq',
    'banners': 'HeroBanner',
    'results': 'Result',
    'branches': 'Branch',
    'videos': 'Video',
    'questions': 'Question',
    'sections': 'Section'
};

// 1. Settings routes FIRST to avoid conflicts
router.get('/settings', settingsController.getSettings);
router.post('/settings/bulk', auth, settingsController.updateSettingsBulk);

// 2. Generic routes
Object.entries(resourceMap).forEach(([path, modelName]) => {
    router.get(`/${path}`, genericController.getAll(modelName));
    router.post(`/${path}`, auth, genericController.create(modelName));
    router.put(`/${path}/:id`, auth, genericController.update(modelName));
    router.delete(`/${path}/:id`, auth, genericController.delete(modelName));
});

module.exports = router;
