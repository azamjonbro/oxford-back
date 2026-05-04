const express = require('express');
const router = express.Router();
const genericController = require('../controllers/generic.controller');
const auth = require('../middlewares/auth');
const models = require('../models');

const resourceMap = {
    'teachers': 'Teacher',
    'courses': 'Course',
    'events': 'Event',
    'benefits': 'Benefit',
    'faqs': 'Faq',
    'banners': 'HeroBanner',
    'results': 'Result',
    'branches': 'Branch',
    'videos': 'Video'
};

Object.entries(resourceMap).forEach(([path, modelName]) => {
    router.get(`/${path}`, genericController.getAll(modelName));
    router.post(`/${path}`, auth, genericController.create(modelName));
    router.delete(`/${path}/:id`, auth, genericController.delete(modelName));
});

module.exports = router;
