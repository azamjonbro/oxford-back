const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { User } = require('./models');

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oxford');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    let admin = await User.findOne({ username: 'admin' });
    if (admin) {
        admin.password = hashedPassword;
        await admin.save();
        console.log('✅ Admin password has been reset to: admin123');
    } else {
        admin = new User({
            username: 'admin',
            password: hashedPassword,
            role: 'admin'
        });
        await admin.save();
        console.log('✅ Admin user created: admin / admin123');
    }
    const Analytics = mongoose.model('Analytics');
    const dummyVisits = [
        { ip: '192.168.1.1', device: 'Desktop', path: '/', timestamp: new Date() },
        { ip: '192.168.1.2', device: 'Mobile', path: '/products', timestamp: new Date() },
        { ip: '192.168.1.3', device: 'Desktop', path: '/', timestamp: new Date() }
    ];
    await Analytics.insertMany(dummyVisits);
    console.log('✅ Seeded dummy analytics data');
    process.exit();
}
seed().catch(err => {
    console.error(err);
    process.exit(1);
});
