const models = require('../models');

exports.getAll = (modelName) => async (req, res) => {
    try {
        const Model = models[modelName];
        let query = Model.find();
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

        const newItem = new Model(data);
        await newItem.save();
        res.status(201).json(newItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.delete = (modelName) => async (req, res) => {
    try {
        const Model = models[modelName];
        await Model.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
