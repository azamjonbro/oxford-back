const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const apiRoutes = require('./routes/api.routes');
const uploadRoutes = require('./routes/upload.routes');
const tracker = require('./middlewares/tracker');
const analyticsController = require('./controllers/analytics.controller');
const seoController = require('./controllers/seo.controller');
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

// Security headers with Helmet
app.use(helmet({
    crossOriginResourcePolicy: false, // Allow frontend to load images
    contentSecurityPolicy: false      // Allow YouTube embeds and external scripts
}));

// Gzip/Brotli compression
app.use(compression());

// Global CORS Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(express.json());
app.use(tracker);

// Rate limiters
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    message: { message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', apiLimiter);

const submitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // Max 15 submissions per 15 minutes
    message: { message: 'Too many submissions, please try again later.' }
});
app.use('/api/placement/register', submitLimiter);
app.use('/api/contact', submitLimiter);

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

// Sitemap and Robots
app.get('/sitemap.xml', seoController.getSitemap);
app.get('/robots.txt', seoController.getRobots);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/placement', require('./routes/placement.routes'));
app.use('/api', apiRoutes);

// Optimized Image Uploads with 1 Year Cache
app.get('/uploads/:filename', require('./middlewares/imageOptimizer'), (req, res, next) => {
    next();
});
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
    maxAge: 31536000000, // 1 year
    immutable: true
}));

app.get('/api/admin/stats', auth, analyticsController.getStats);

app.listen(PORT, () => {
    console.log(`🚀 Modular Server running on http://localhost:${PORT}`);
});
