const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({ title: String, slug: String, content: String, image: String }, { timestamps: true });
const SettingSchema = new mongoose.Schema({ key: { type: String, unique: true }, value: mongoose.Schema.Types.Mixed });
const SubscriberSchema = new mongoose.Schema({ email: { type: String, unique: true } });
const GallerySchema = new mongoose.Schema({ title: String, url: String });

module.exports = {
    User: require('./User'),
    Analytics: require('./Analytics'),
    Post: mongoose.model('Post', PostSchema),
    Setting: mongoose.model('Setting', SettingSchema),
    Subscriber: mongoose.model('Subscriber', SubscriberSchema),
    Gallery: mongoose.model('Gallery', GallerySchema),
    
    // Newly created models for pages
    Teacher: require('./Teacher'),
    Course: require('./Course'),
    Event: require('./Event'),
    Benefit: require('./Benefit'),
    Faq: require('./Faq'),
    Message: require('./Message'),
    HeroBanner: require('./HeroBanner'),
    Result: require('./Result'),
    Branch: require('./Branch'),
    Video: require('./Video')
};
