const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const apiRoutes = require('./routes/api.routes');
const uploadRoutes = require('./routes/upload.routes');
const tracker = require('./middlewares/tracker');
const analyticsController = require('./controllers/analytics.controller');
const auth = require('./middlewares/auth');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.use(express.json());
app.use(tracker);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oxfort')
    .then(async () => {
        console.log('✅ MongoDB connected (Modular)');
        
        // Auto-seed admin user
        try {
            const { User } = require('./models');
            const bcrypt = require('bcryptjs');
            const existingAdmin = await User.findOne({ username: 'admin' });
            if (!existingAdmin) {
                const hashedPassword = await bcrypt.hash('admin123', 10);
                const admin = new User({ username: 'admin', password: hashedPassword, role: 'admin' });
                await admin.save();
                console.log('✅ Auto-created default admin user: admin / admin123');
            } else {
                // Ensure password is admin123 just in case
                const isMatch = await bcrypt.compare('admin123', existingAdmin.password);
                if (!isMatch) {
                    existingAdmin.password = await bcrypt.hash('admin123', 10);
                    await existingAdmin.save();
                    console.log('✅ Auto-reset admin password to: admin123');
                }
            }
        } catch (seedErr) {
            console.error('❌ Failed to auto-seed admin:', seedErr.message);
        }
    })
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/placement', require('./routes/placement.routes'));
app.use('/api', apiRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.get('/api/admin/stats', auth, analyticsController.getStats);

app.listen(PORT, () => {
    console.log(`🚀 Modular Server running on http://localhost:${PORT}`);
});
