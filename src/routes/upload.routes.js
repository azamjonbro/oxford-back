const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middlewares/auth');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/') || file.originalname.endsWith('.mp3') || file.originalname.endsWith('.wav') || file.originalname.endsWith('.m4a')) {
            cb(null, true);
        } else {
            cb(new Error('Only images and audio files are allowed'));
        }
    }
});

router.post('/', auth, (req, res, next) => {
    console.log('Upload request received');
    next();
}, upload.single('image'), (req, res) => {
    try {
        console.log('File:', req.file);
        if (!req.file) {
            console.log('No file in request');
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const fileUrl = `/uploads/${req.file.filename}`;
        console.log('File uploaded successfully:', fileUrl);
        res.json({ url: fileUrl });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
