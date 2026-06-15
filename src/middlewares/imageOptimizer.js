const path = require('path');
const fs = require('fs');
let sharp;
try {
    sharp = require('sharp');
} catch (e) {
    console.warn('⚠️ sharp package is not installed or failed to load. Dynamic image optimization is disabled.');
}

module.exports = async (req, res, next) => {
    if (!sharp) {
        return next();
    }

    const { filename } = req.params;
    const ext = path.extname(filename).toLowerCase();
    
    // Only optimize common images
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        return next();
    }

    const originalPath = path.join(__dirname, '../../uploads', filename);
    if (!fs.existsSync(originalPath)) {
        return next();
    }

    // Determine target format
    let targetFormat = null;
    const accept = req.headers.accept || '';

    // Check query param first, then Accept header
    if (req.query.format === 'avif' || accept.includes('image/avif')) {
        targetFormat = 'avif';
    } else if (req.query.format === 'webp' || accept.includes('image/webp')) {
        targetFormat = 'webp';
    }

    if (!targetFormat) {
        return next(); // serve original static file
    }

    // Cache path
    const cacheDir = path.join(__dirname, '../../uploads/cache');
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    const cachedFilename = `${filename}.${targetFormat}`;
    const cachedPath = path.join(cacheDir, cachedFilename);

    // If cached version exists, send it
    if (fs.existsSync(cachedPath)) {
        res.setHeader('Content-Type', `image/${targetFormat}`);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.sendFile(cachedPath);
    }

    // Otherwise, convert dynamically
    try {
        await sharp(originalPath)
            .toFormat(targetFormat, { quality: 80 })
            .toFile(cachedPath);

        res.setHeader('Content-Type', `image/${targetFormat}`);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.sendFile(cachedPath);
    } catch (err) {
        console.error('Sharp dynamic conversion failed:', err);
        return next(); // fallback to original file
    }
};
