const models = require('../models');
const { clearResourceCache } = require('../middlewares/responseCache');

const modelToResource = {
    'Teacher': 'teachers',
    'Course': 'courses',
    'Event': 'events',
    'Benefit': 'benefits',
    'Faq': 'faqs',
    'HeroBanner': 'banners',
    'Result': 'results',
    'Branch': 'branches',
    'Video': 'videos',
    'Question': 'questions',
    'Section': 'sections'
};

exports.getAll = (modelName) => async (req, res) => {
    try {
        const Model = models[modelName];
        let query = Model.find().sort({ order: 1, createdAt: -1 });
        // Conditionally populate if models have these fields
        if (['Product', 'Order'].includes(modelName)) {
            query = query.populate('category product');
        }
        if (modelName === 'Teacher') {
            query = query.populate('branch');
        }
        const data = await query;
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.create = (modelName) => async (req, res) => {
    try {
        const Model = models[modelName];
        const data = { ...req.body };

        // Remove empty ObjectId fields to avoid Mongoose cast errors
        if (data.branch === '' || data.branch === null) {
            delete data.branch;
        }

        if (modelName === 'Teacher' && data.category !== 'teacher') {
            data.ieltsScore = null;
        }

        const newItem = new Model(data);
        await newItem.save();
        
        // Invalidate cache
        if (modelToResource[modelName]) {
            clearResourceCache(modelToResource[modelName]);
        }

        res.status(201).json(newItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.update = (modelName) => async (req, res) => {
    try {
        const Model = models[modelName];
        const data = { ...req.body };
        if (data.branch === '' || data.branch === null) {
            delete data.branch;
        }
        if (modelName === 'Teacher' && data.category !== 'teacher') {
            data.ieltsScore = null;
        }
        const updatedItem = await Model.findByIdAndUpdate(req.params.id, data, { new: true });
        
        // Invalidate cache
        if (modelToResource[modelName]) {
            clearResourceCache(modelToResource[modelName]);
        }

        res.json(updatedItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.delete = (modelName) => async (req, res) => {
    try {
        const Model = models[modelName];
        await Model.findByIdAndDelete(req.params.id);
        
        // Invalidate cache
        if (modelToResource[modelName]) {
            clearResourceCache(modelToResource[modelName]);
        }

        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
