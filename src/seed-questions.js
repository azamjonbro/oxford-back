const mongoose = require('mongoose');
require('dotenv').config();
const { Question, Section, Setting } = require('./models');

const sections = [
    { key: 'grammar', title: 'Grammar & Structure', order: 1, isActive: true },
    { key: 'vocabulary', title: 'Vocabulary & Lexicon', order: 2, isActive: true },
    { key: 'reading', title: 'Reading Comprehension', order: 3, isActive: true },
    { key: 'listening', title: 'Listening Comprehension', order: 4, isActive: true }
];

const settings = [
    { key: 'placement_test_timer', value: '45' }, // global timer in minutes
    { key: 'telegram_bot_token', value: '' }, // placeholder
    { key: 'telegram_chat_id', value: '' }, // placeholder
    { key: 'email_smtp_host', value: '' },
    { key: 'email_smtp_port', value: '465' },
    { key: 'email_user', value: '' },
    { key: 'email_pass', value: '' },
    { key: 'email_to', value: '' },
    {
        key: 'placement_test_levels',
        value: JSON.stringify([
            { name: 'Beginner', min: 0, max: 20, recommendation: 'We recommend starting from the basics to build a strong foundation.' },
            { name: 'Elementary', min: 21, max: 40, recommendation: 'You have basic communication skills. Let\'s boost your speaking and grammar!' },
            { name: 'Pre-Intermediate', min: 41, max: 60, recommendation: 'Great progress! You can understand familiar topics. Let\'s aim for intermediate fluency.' },
            { name: 'Intermediate', min: 61, max: 80, recommendation: 'Excellent! You can express yourself in various contexts. Let\'s refine your advanced skills.' },
            { name: 'Upper-Intermediate', min: 81, max: 90, recommendation: 'Impressive score! You are very close to high fluency. Let\'s prepare for IELTS or business English.' },
            { name: 'IELTS Ready', min: 91, max: 100, recommendation: 'Outstanding! You possess advanced English skills. You are fully ready for intensive IELTS prep!' }
        ])
    }
];

const questions = [
    // Grammar Section
    {
        text: 'Choose the correct verb: "She ___ a student."',
        options: ['am', 'is', 'are', 'be'],
        correctAnswers: ['is'],
        type: 'single',
        section: 'grammar',
        category: 'Beginner',
        order: 1
    },
    {
        text: 'Identify the correct past tense: "We ___ to the cinema yesterday."',
        options: ['go', 'goes', 'went', 'going'],
        correctAnswers: ['went'],
        type: 'single',
        section: 'grammar',
        category: 'Elementary',
        order: 2
    },
    {
        text: 'Complete the sentence with one word: "I ___ not like tomatoes."',
        options: [],
        correctAnswers: ['do'],
        type: 'text',
        section: 'grammar',
        category: 'Elementary',
        order: 3
    },
    {
        text: 'Complete the conditional sentence: "If it rains tomorrow, we ___ stay at home."',
        options: ['would', 'will', 'did', 'have'],
        correctAnswers: ['will'],
        type: 'single',
        section: 'grammar',
        category: 'Pre-Intermediate',
        order: 4
    },
    {
        text: 'Select ALL the correct irregular past participles (Multiple choice):',
        options: ['Brought', 'Teached', 'Caught', 'Buyed'],
        correctAnswers: ['Brought', 'Caught'],
        type: 'multiple',
        section: 'grammar',
        category: 'Intermediate',
        order: 5
    },
    {
        text: 'Choose the correct form: "Had I known about the schedule change, I ___ you."',
        options: ['would inform', 'will inform', 'would have informed', 'informed'],
        correctAnswers: ['would have informed'],
        type: 'single',
        section: 'grammar',
        category: 'IELTS',
        order: 6
    },

    // Vocabulary Section
    {
        text: 'Which of the following is a fruit?',
        options: ['Dog', 'Car', 'Apple', 'Chair'],
        correctAnswers: ['Apple'],
        type: 'single',
        section: 'vocabulary',
        category: 'Beginner',
        order: 7
    },
    {
        text: 'What is the opposite of the word "hot"?',
        options: ['Warm', 'Cold', 'Dry', 'Dirty'],
        correctAnswers: ['Cold'],
        type: 'single',
        section: 'vocabulary',
        category: 'Elementary',
        order: 8
    },
    {
        text: 'Complete the sentence: "He is interested ___ learning new languages."',
        options: ['on', 'at', 'in', 'for'],
        correctAnswers: ['in'],
        type: 'single',
        section: 'vocabulary',
        category: 'Intermediate',
        order: 9
    },
    {
        text: 'Type the missing preposition: "She has been working here ___ five years."',
        options: [],
        correctAnswers: ['for'],
        type: 'text',
        section: 'vocabulary',
        category: 'Upper-Intermediate',
        order: 10
    },
    {
        text: 'Select the word that best fits the sentence: "The candidate\'s argument was highly ___ and convinced the entire panel."',
        options: ['cogent', 'redundant', 'erroneous', 'superficial'],
        correctAnswers: ['cogent'],
        type: 'single',
        section: 'vocabulary',
        category: 'IELTS',
        order: 11
    },

    // Reading Section
    {
        text: 'Why did she finish her homework?',
        passage: 'Although she was tired, she finished her homework.',
        options: ['Because she was tired', 'Despite being tired', 'She did not finish it', 'Because it was easy'],
        correctAnswers: ['Despite being tired'],
        type: 'single',
        section: 'reading',
        category: 'Pre-Intermediate',
        order: 12
    },
    {
        text: 'According to the passage, what is the main purpose of embedding sensors in physical objects?',
        passage: 'The Internet of Things (IoT) describes the network of physical objects—"things"—that are embedded with sensors, software, and other technologies for the purpose of connecting and exchanging data with other devices and systems over the internet.',
        options: ['To make them look modern', 'To connect and exchange data over the internet', 'To increase their cost', 'To prevent theft'],
        correctAnswers: ['To connect and exchange data over the internet'],
        type: 'single',
        section: 'reading',
        category: 'Intermediate',
        order: 13
    },
    {
        text: 'What is the primary cause of global warming mentioned in the text?',
        passage: 'Global warming is the long-term heating of Earth\'s climate system observed since the pre-industrial period due to human activities, primarily fossil fuel burning, which increases heat-trapping greenhouse gas levels in Earth\'s atmosphere.',
        options: ['Solar radiation', 'Fossil fuel burning', 'Volcanic eruptions', 'Deforestation'],
        correctAnswers: ['Fossil fuel burning'],
        type: 'single',
        section: 'reading',
        category: 'Upper-Intermediate',
        order: 14
    },

    // Listening Section
    {
        text: 'Listen to the audio. What time does the library close on Saturdays?',
        options: ['5:00 PM', '6:00 PM', '8:00 PM', 'Closed'],
        correctAnswers: ['5:00 PM'],
        type: 'single',
        section: 'listening',
        category: 'IELTS',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Standard sample audio URL
        order: 15
    }
];

async function seedQuestions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oxfort');
        console.log('✅ Connected to MongoDB for seeding questions...');

        // 1. Seed Sections
        await Section.deleteMany({});
        await Section.insertMany(sections);
        console.log('✅ Seeded placement test sections');

        // 2. Seed Settings
        for (const s of settings) {
            await Setting.findOneAndUpdate(
                { key: s.key },
                { value: s.value },
                { upsert: true, new: true }
            );
        }
        console.log('✅ Seeded placement test settings');

        // 3. Seed Questions
        await Question.deleteMany({});
        await Question.insertMany(questions);
        console.log('✅ Seeded placement test questions');

        console.log('🎉 Seeding successfully completed!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding error:', err);
        process.exit(1);
    }
}

seedQuestions();
