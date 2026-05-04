const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oxfort');
    const users = await User.find({});
    console.log("Users in DB:", users);
    process.exit(0);
}
check();
