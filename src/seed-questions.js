const mongoose = require('mongoose');
require('dotenv').config();
const { Question, Section, Setting } = require('./models');

const sections = [
    { key: 'grammar', title: 'Grammar & Structure', order: 1, isActive: true },
    { key: 'vocabulary', title: 'Vocabulary & Lexicon', order: 2, isActive: true },
    { key: 'mistake', title: 'Correct the Mistake', order: 3, isActive: true },
    { key: 'sentence', title: 'Make a Sentence', order: 4, isActive: true },
    { key: 'reading', title: 'Reading Comprehension', order: 5, isActive: true },
    { key: 'listening', title: 'Listening Comprehension', order: 6, isActive: true },
    { key: 'writing', title: 'Writing Section', order: 7, isActive: true },
    { key: 'essay', title: 'Essay Section', order: 8, isActive: true }
];

const settings = [
    { key: 'placement_test_timer', value: '60' }, // global timer in minutes
    { key: 'telegram_bot_token', value: '' },
    { key: 'telegram_chat_id', value: '' },
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
            { name: 'Intermediate', min: 61, max: 75, recommendation: 'Excellent! You can express yourself in various contexts. Let\'s refine your advanced skills.' },
            { name: 'Upper-Intermediate', min: 76, max: 88, recommendation: 'Impressive score! You are very close to high fluency. Let\'s prepare for IELTS or business English.' },
            { name: 'IELTS Foundation', min: 89, max: 100, recommendation: 'Outstanding! You possess advanced English skills. You are fully ready for intensive IELTS prep!' }
        ])
    }
];

const questions = [
    // === GRAMMAR SECTION (20 questions) ===
    {
        text: 'Identify the correct form: "She ___ to school by bus every morning."',
        options: ['go', 'goes', 'going', 'wented'],
        correctAnswers: ['goes'],
        type: 'single',
        section: 'grammar',
        category: 'Beginner',
        order: 1
    },
    {
        text: 'Choose the correct Present Continuous form: "Look! The children ___ in the garden right now."',
        options: ['play', 'is playing', 'are playing', 'played'],
        correctAnswers: ['are playing'],
        type: 'single',
        section: 'grammar',
        category: 'Beginner',
        order: 2
    },
    {
        text: 'Identify the correct Past Simple verb: "They ___ a very interesting film last night."',
        options: ['watch', 'watched', 'watches', 'watching'],
        correctAnswers: ['watched'],
        type: 'single',
        section: 'grammar',
        category: 'Beginner',
        order: 3
    },
    {
        text: 'Complete the sentence: "We ___ visit our grandparents next Sunday."',
        options: ['are going to', 'going to', 'will going to', 'is going to'],
        correctAnswers: ['are going to'],
        type: 'single',
        section: 'grammar',
        category: 'Elementary',
        order: 4
    },
    {
        text: 'Choose the correct model verb: "I ___ speak French when I was a child, but now I have forgotten it."',
        options: ['can', 'cant', 'could', 'couldnt'],
        correctAnswers: ['could'],
        type: 'single',
        section: 'grammar',
        category: 'Elementary',
        order: 5
    },
    {
        text: 'Complete the description: "___ a beautiful park near my house."',
        options: ['There is', 'There are', 'It has', 'There be'],
        correctAnswers: ['There is'],
        type: 'single',
        section: 'grammar',
        category: 'Elementary',
        order: 6
    },
    {
        text: 'Select the correct article: "Would you like ___ apple or a banana?"',
        options: ['a', 'an', 'the', 'no article'],
        correctAnswers: ['an'],
        type: 'single',
        section: 'grammar',
        category: 'Elementary',
        order: 7
    },
    {
        text: 'Choose the correct preposition: "Our next lesson starts ___ 9 o\'clock in the morning."',
        options: ['on', 'in', 'at', 'for'],
        correctAnswers: ['at'],
        type: 'single',
        section: 'grammar',
        category: 'Elementary',
        order: 8
    },
    {
        text: 'Complete the sentence: "He is interested ___ studying international relations."',
        options: ['in', 'at', 'on', 'about'],
        correctAnswers: ['in'],
        type: 'single',
        section: 'grammar',
        category: 'Pre-Intermediate',
        order: 9
    },
    {
        text: 'Complete the comparative: "This smartphone is much ___ than my previous one."',
        options: ['expensive', 'expensiver', 'more expensive', 'most expensive'],
        correctAnswers: ['more expensive'],
        type: 'single',
        section: 'grammar',
        category: 'Pre-Intermediate',
        order: 10
    },
    {
        text: 'Choose the correct article: "He is ___ honest man who always tells the truth."',
        options: ['a', 'an', 'the', 'no article'],
        correctAnswers: ['an'],
        type: 'single',
        section: 'grammar',
        category: 'Pre-Intermediate',
        order: 11
    },
    {
        text: 'Complete the sentence: "If she ___ hard, she will pass the exam easily."',
        options: ['study', 'studies', 'studied', 'will study'],
        correctAnswers: ['studies'],
        type: 'single',
        section: 'grammar',
        category: 'Pre-Intermediate',
        order: 12
    },
    {
        text: 'Identify the correct passive voice: "The classroom ___ every day by the students."',
        options: ['cleans', 'is cleaning', 'is cleaned', 'was cleaned'],
        correctAnswers: ['is cleaned'],
        type: 'single',
        section: 'grammar',
        category: 'Intermediate',
        order: 13
    },
    {
        text: 'Complete the past continuous sentence: "While I ___ my homework, the phone rang."',
        options: ['do', 'did', 'was doing', 'were doing'],
        correctAnswers: ['was doing'],
        type: 'single',
        section: 'grammar',
        category: 'Intermediate',
        order: 14
    },
    {
        text: 'Choose the correct relative pronoun: "The teacher ___ teaches us English is from London."',
        options: ['which', 'who', 'whose', 'whom'],
        correctAnswers: ['who'],
        type: 'single',
        section: 'grammar',
        category: 'Intermediate',
        order: 15
    },
    {
        text: 'Complete the present perfect continuous: "They ___ English for three years."',
        options: ['have studied', 'have been studying', 'has been studying', 'are studying'],
        correctAnswers: ['have been studying'],
        type: 'single',
        section: 'grammar',
        category: 'Upper-Intermediate',
        order: 16
    },
    {
        text: 'Choose the correct past perfect form: "By the time we arrived at the cinema, the movie ___ already."',
        options: ['started', 'has started', 'had started', 'would start'],
        correctAnswers: ['had started'],
        type: 'single',
        section: 'grammar',
        category: 'Upper-Intermediate',
        order: 17
    },
    {
        text: 'Select the correct conditional: "If I ___ you, I would accept the job offer immediately."',
        options: ['am', 'was', 'were', 'had been'],
        correctAnswers: ['were'],
        type: 'single',
        section: 'grammar',
        category: 'Upper-Intermediate',
        order: 18
    },
    {
        text: 'Identify the correct third conditional: "If we had left earlier, we ___ the train."',
        options: ['would miss', 'wont miss', 'would not have missed', 'did not miss'],
        correctAnswers: ['would not have missed'],
        type: 'single',
        section: 'grammar',
        category: 'IELTS',
        order: 19
    },
    {
        text: 'Choose the correct inversion structure: "Seldom ___ such a beautiful song."',
        options: ['I have heard', 'have I heard', 'had I hear', 'I heard'],
        correctAnswers: ['have I heard'],
        type: 'single',
        section: 'grammar',
        category: 'IELTS',
        order: 20
    },

    // === VOCABULARY SECTION (20 questions) ===
    // Category 1: English -> Uzbek
    {
        text: 'What is the Uzbek translation for the English word "Holiday"?',
        options: ['Mehnat', 'Ta\'til', 'Sabab', 'Nonushta'],
        correctAnswers: ['Ta\'til'],
        type: 'single',
        section: 'vocabulary',
        category: 'Beginner',
        order: 21
    },
    {
        text: 'What is the Uzbek translation for the English word "Practice"?',
        options: ['Mashq qilish', 'Dam olish', 'Mehmon', 'Hamshira'],
        correctAnswers: ['Mashq qilish'],
        type: 'single',
        section: 'vocabulary',
        category: 'Beginner',
        order: 22
    },
    {
        text: 'What is the Uzbek translation for the English word "Conversation"?',
        options: ['Suhbat', 'Mavzu', 'Maktab', 'Tushlik'],
        correctAnswers: ['Suhbat'],
        type: 'single',
        section: 'vocabulary',
        category: 'Elementary',
        order: 23
    },
    {
        text: 'What is the Uzbek translation for the English word "Recognize"?',
        options: ['Tan olmoq', 'Tanish (taniy bilmoq)', 'Eslamoq', 'Unutmoq'],
        correctAnswers: ['Tanish (taniy bilmoq)'],
        type: 'single',
        section: 'vocabulary',
        category: 'Elementary',
        order: 24
    },
    // Category 2: Uzbek -> English
    {
        text: 'Choose the correct English translation for "Mehmon":',
        options: ['Host', 'Guest', 'Stranger', 'Neighbor'],
        correctAnswers: ['Guest'],
        type: 'single',
        section: 'vocabulary',
        category: 'Beginner',
        order: 25
    },
    {
        text: 'Choose the correct English translation for "Sabab":',
        options: ['Result', 'Reason', 'Purpose', 'Solution'],
        correctAnswers: ['Reason'],
        type: 'single',
        section: 'vocabulary',
        category: 'Beginner',
        order: 26
    },
    {
        text: 'Choose the correct English translation for "Hamshira":',
        options: ['Doctor', 'Engineer', 'Nurse', 'Teacher'],
        correctAnswers: ['Nurse'],
        type: 'single',
        section: 'vocabulary',
        category: 'Elementary',
        order: 27
    },
    {
        text: 'Choose the correct English translation for "Nonushta":',
        options: ['Lunch', 'Dinner', 'Breakfast', 'Supper'],
        correctAnswers: ['Breakfast'],
        type: 'single',
        section: 'vocabulary',
        category: 'Elementary',
        order: 28
    },
    // Category 3: Synonyms, Antonyms & Matching words
    {
        text: 'Choose the synonym for the word "Huge":',
        options: ['Tiny', 'Large', 'Heavy', 'Empty'],
        correctAnswers: ['Large'],
        type: 'single',
        section: 'vocabulary',
        category: 'Elementary',
        order: 29
    },
    {
        text: 'Choose the synonym for the word "Beautiful":',
        options: ['Ugly', 'Pretty', 'Messy', 'Dark'],
        correctAnswers: ['Pretty'],
        type: 'single',
        section: 'vocabulary',
        category: 'Elementary',
        order: 30
    },
    {
        text: 'Choose the antonym for the word "Generous":',
        options: ['Kind', 'Mean', 'Selfish', 'Brave'],
        correctAnswers: ['Mean', 'Selfish'],
        type: 'multiple',
        section: 'vocabulary',
        category: 'Pre-Intermediate',
        order: 31
    },
    {
        text: 'Choose the antonym for the word "Difficult":',
        options: ['Hard', 'Easy', 'Simple', 'Soft'],
        correctAnswers: ['Easy', 'Simple'],
        type: 'multiple',
        section: 'vocabulary',
        category: 'Pre-Intermediate',
        order: 32
    },
    {
        text: 'Which word matches the definition: "A person who designs buildings"?',
        options: ['Doctor', 'Architect', 'Pilot', 'Carpenter'],
        correctAnswers: ['Architect'],
        type: 'single',
        section: 'vocabulary',
        category: 'Pre-Intermediate',
        order: 33
    },
    {
        text: 'Which word matches the definition: "Very tired after a lot of work"?',
        options: ['Exhausted', 'Excited', 'Bored', 'Sleepy'],
        correctAnswers: ['Exhausted'],
        type: 'single',
        section: 'vocabulary',
        category: 'Intermediate',
        order: 34
    },
    {
        text: 'Identify the synonym of the word "Essential":',
        options: ['Optional', 'Important', 'Necessary', 'Unwanted'],
        correctAnswers: ['Necessary', 'Important'],
        type: 'multiple',
        section: 'vocabulary',
        category: 'Intermediate',
        order: 35
    },
    {
        text: 'Identify the antonym of the word "Accidental":',
        options: ['Deliberate', 'Intentional', 'Unplanned', 'Sudden'],
        correctAnswers: ['Deliberate', 'Intentional'],
        type: 'multiple',
        section: 'vocabulary',
        category: 'Upper-Intermediate',
        order: 36
    },
    {
        text: 'What is the meaning of the idiom "Cost an arm and a leg"?',
        options: ['Very cheap', 'Very expensive', 'Extremely painful', 'Free of charge'],
        correctAnswers: ['Very expensive'],
        type: 'single',
        section: 'vocabulary',
        category: 'Upper-Intermediate',
        order: 37
    },
    {
        text: 'Choose the synonym for "Conspicuous":',
        options: ['Hidden', 'Noticeable', 'Vague', 'Silent'],
        correctAnswers: ['Noticeable'],
        type: 'single',
        section: 'vocabulary',
        category: 'IELTS',
        order: 38
    },
    {
        text: 'Which word best fits: "The teacher warned that plagiarism would lead to ___ consequences."',
        options: ['trivial', 'deleterious', 'beneficial', 'innovative'],
        correctAnswers: ['deleterious'],
        type: 'single',
        section: 'vocabulary',
        category: 'IELTS',
        order: 39
    },
    {
        text: 'Identify the antonym of "Transient":',
        options: ['Permanent', 'Temporary', 'Short-lived', 'Fleeting'],
        correctAnswers: ['Permanent'],
        type: 'single',
        section: 'vocabulary',
        category: 'IELTS',
        order: 40
    },

    // === CORRECT THE MISTAKE SECTION (10 questions) ===
    {
        text: 'Correct the sentence: "She go to school every day."',
        correctAnswers: ['She goes to school every day.', 'She goes to school every day'],
        type: 'text',
        section: 'mistake',
        category: 'Elementary',
        order: 41
    },
    {
        text: 'Correct the sentence: "I am not liking tomatoes."',
        correctAnswers: ['I do not like tomatoes.', 'I don\'t like tomatoes.', 'I do not like tomatoes', 'I don\'t like tomatoes'],
        type: 'text',
        section: 'mistake',
        category: 'Elementary',
        order: 42
    },
    {
        text: 'Correct the sentence: "He don\'t have a car."',
        correctAnswers: ['He doesn\'t have a car.', 'He does not have a car.', 'He doesn\'t have a car', 'He does not have a car'],
        type: 'text',
        section: 'mistake',
        category: 'Elementary',
        order: 43
    },
    {
        text: 'Correct the sentence: "We went to the cinema yesterday night."',
        correctAnswers: ['We went to the cinema last night.', 'We went to the cinema last night'],
        type: 'text',
        section: 'mistake',
        category: 'Pre-Intermediate',
        order: 44
    },
    {
        text: 'Correct the sentence: "She is more taller than her sister."',
        correctAnswers: ['She is taller than her sister.', 'She is taller than her sister'],
        type: 'text',
        section: 'mistake',
        category: 'Pre-Intermediate',
        order: 45
    },
    {
        text: 'Correct the sentence: "I have seen him yesterday."',
        correctAnswers: ['I saw him yesterday.', 'I saw him yesterday'],
        type: 'text',
        section: 'mistake',
        category: 'Pre-Intermediate',
        order: 46
    },
    {
        text: 'Correct the sentence: "Where I can buy a ticket?"',
        correctAnswers: ['Where can I buy a ticket?', 'Where can I buy a ticket'],
        type: 'text',
        section: 'mistake',
        category: 'Intermediate',
        order: 47
    },
    {
        text: 'Correct the sentence: "I look forward to meet you."',
        correctAnswers: ['I look forward to meeting you.', 'I look forward to meeting you'],
        type: 'text',
        section: 'mistake',
        category: 'Intermediate',
        order: 48
    },
    {
        text: 'Correct the sentence: "If I will win the lottery, I will buy a house."',
        correctAnswers: ['If I win the lottery, I will buy a house.', 'If I win the lottery I will buy a house.', 'If I win the lottery, I will buy a house'],
        type: 'text',
        section: 'mistake',
        category: 'Upper-Intermediate',
        order: 49
    },
    {
        text: 'Correct the sentence: "She suggested to go to the park."',
        correctAnswers: ['She suggested going to the park.', 'She suggested that we go to the park.', 'She suggested going to the park'],
        type: 'text',
        section: 'mistake',
        category: 'IELTS',
        order: 50
    },

    // === MAKE A SENTENCE SECTION (10 questions) ===
    {
        text: 'Arrange words into a sentence: "always / coffee / drinks / morning / she"',
        correctAnswers: ['She always drinks coffee in the morning.', 'she always drinks coffee in the morning', 'She always drinks coffee in the morning'],
        type: 'text',
        section: 'sentence',
        category: 'Elementary',
        order: 51
    },
    {
        text: 'Arrange words into a sentence: "like / do / chocolate / you / eating"',
        correctAnswers: ['Do you like eating chocolate?', 'do you like eating chocolate?', 'Do you like eating chocolate'],
        type: 'text',
        section: 'sentence',
        category: 'Elementary',
        order: 52
    },
    {
        text: 'Arrange words into a sentence: "going / weekend / we / to / the / are / beach / this"',
        correctAnswers: ['We are going to the beach this weekend.', 'we are going to the beach this weekend', 'We are going to the beach this weekend'],
        type: 'text',
        section: 'sentence',
        category: 'Elementary',
        order: 53
    },
    {
        text: 'Arrange words into a sentence: "book / reading / is / now / she / interesting / an"',
        correctAnswers: ['She is reading an interesting book now.', 'she is reading an interesting book now', 'She is reading an interesting book now', 'She is reading an interesting book right now.'],
        type: 'text',
        section: 'sentence',
        category: 'Pre-Intermediate',
        order: 54
    },
    {
        text: 'Arrange words into a sentence: "never / he / late / for / is / lessons / his"',
        correctAnswers: ['He is never late for his lessons.', 'he is never late for his lessons', 'He is never late for his lessons'],
        type: 'text',
        section: 'sentence',
        category: 'Pre-Intermediate',
        order: 55
    },
    {
        text: 'Arrange words into a sentence: "dinner / has / cooked / mother / my / already"',
        correctAnswers: ['My mother has already cooked dinner.', 'my mother has already cooked dinner', 'My mother has already cooked dinner'],
        type: 'text',
        section: 'sentence',
        category: 'Intermediate',
        order: 56
    },
    {
        text: 'Arrange words into a sentence: "yesterday / homework / did / you / do / your"',
        correctAnswers: ['Did you do your homework yesterday?', 'did you do your homework yesterday?', 'Did you do your homework yesterday'],
        type: 'text',
        section: 'sentence',
        category: 'Intermediate',
        order: 57
    },
    {
        text: 'Arrange words into a sentence: "cars / in / will / future / fly / the"',
        correctAnswers: ['Cars will fly in the future.', 'will cars fly in the future?', 'Cars will fly in the future'],
        type: 'text',
        section: 'sentence',
        category: 'Upper-Intermediate',
        order: 58
    },
    {
        text: 'Arrange words into a sentence: "teacher / explained / task / clearly / the / us / to / the"',
        correctAnswers: ['The teacher explained the task to us clearly.', 'The teacher clearly explained the task to us.', 'the teacher explained the task to us clearly'],
        type: 'text',
        section: 'sentence',
        category: 'Upper-Intermediate',
        order: 59
    },
    {
        text: 'Arrange words into a sentence: "harder / study / you / the / score / you / higher / the"',
        correctAnswers: ['The harder you study, the higher you score.', 'The harder you study the higher you score.', 'the harder you study, the higher you score'],
        type: 'text',
        section: 'sentence',
        category: 'IELTS',
        order: 60
    },

    // === READING SECTION (1 passage, 10 questions/points total) ===
    {
        text: 'What is the main topic of the passage?',
        passage: 'Oxford Learning Center is a world-renowned educational academy established to help students master English fluency. Utilizing state-of-the-art immersive curricula, the center caters to learners ranging from pre-teen students to adults. The center focuses on interactive speaking sessions, detailed grammar instruction, and standardized preparation courses like IELTS. Feedback shows that students who complete the intermediate curriculum increase their proficiency by up to two CEFR levels within six months. The academy recently integrated digital resources and automated testing systems to ensure that learning is both efficient and fun.',
        options: ['The history of Oxford University', 'An overview of Oxford Learning Center courses and methods', 'The importance of standard exams', 'Digital resources in schools'],
        correctAnswers: ['An overview of Oxford Learning Center courses and methods'],
        type: 'single',
        section: 'reading',
        category: 'Elementary',
        order: 61
    },
    {
        text: 'According to the passage, the academy caters to learners from pre-teen to adult ages. (True/False/Not Given)',
        passage: 'Oxford Learning Center is a world-renowned educational academy established to help students master English fluency. Utilizing state-of-the-art immersive curricula, the center caters to learners ranging from pre-teen students to adults. The center focuses on interactive speaking sessions, detailed grammar instruction, and standardized preparation courses like IELTS. Feedback shows that students who complete the intermediate curriculum increase their proficiency by up to two CEFR levels within six months. The academy recently integrated digital resources and automated testing systems to ensure that learning is both efficient and fun.',
        options: ['True', 'False', 'Not Given'],
        correctAnswers: ['True'],
        type: 'single',
        section: 'reading',
        category: 'Elementary',
        order: 62
    },
    {
        text: 'Fill in the blank: The academy recently integrated digital ___ and automated testing systems.',
        passage: 'Oxford Learning Center is a world-renowned educational academy established to help students master English fluency. Utilizing state-of-the-art immersive curricula, the center caters to learners ranging from pre-teen students to adults. The center focuses on interactive speaking sessions, detailed grammar instruction, and standardized preparation courses like IELTS. Feedback shows that students who complete the intermediate curriculum increase their proficiency by up to two CEFR levels within six months. The academy recently integrated digital resources and automated testing systems to ensure that learning is both efficient and fun.',
        options: ['classrooms', 'teachers', 'resources', 'libraries'],
        correctAnswers: ['resources'],
        type: 'single',
        section: 'reading',
        category: 'Pre-Intermediate',
        order: 63
    },
    {
        text: 'What kind of preparation courses are specifically mentioned in the text?',
        passage: 'Oxford Learning Center is a world-renowned educational academy established to help students master English fluency. Utilizing state-of-the-art immersive curricula, the center caters to learners ranging from pre-teen students to adults. The center focuses on interactive speaking sessions, detailed grammar instruction, and standardized preparation courses like IELTS. Feedback shows that students who complete the intermediate curriculum increase their proficiency by up to two CEFR levels within six months. The academy recently integrated digital resources and automated testing systems to ensure that learning is both efficient and fun.',
        options: ['SAT and TOEFL', 'IELTS', 'Cambridge English', 'Business English'],
        correctAnswers: ['IELTS'],
        type: 'single',
        section: 'reading',
        category: 'Pre-Intermediate',
        order: 64
    },
    {
        text: 'How much do students typically improve after completing the intermediate curriculum in six months?',
        passage: 'Oxford Learning Center is a world-renowned educational academy established to help students master English fluency. Utilizing state-of-the-art immersive curricula, the center caters to learners ranging from pre-teen students to adults. The center focuses on interactive speaking sessions, detailed grammar instruction, and standardized preparation courses like IELTS. Feedback shows that students who complete the intermediate curriculum increase their proficiency by up to two CEFR levels within six months. The academy recently integrated digital resources and automated testing systems to ensure that learning is both efficient and fun.',
        options: ['One IELTS band', 'Up to two CEFR levels', 'No significant change', 'Ten percentage points'],
        correctAnswers: ['Up to two CEFR levels'],
        type: 'single',
        section: 'reading',
        category: 'Intermediate',
        order: 65
    },
    {
        text: 'The academy only has native English speaking teachers. (True/False/Not Given)',
        passage: 'Oxford Learning Center is a world-renowned educational academy established to help students master English fluency. Utilizing state-of-the-art immersive curricula, the center caters to learners ranging from pre-teen students to adults. The center focuses on interactive speaking sessions, detailed grammar instruction, and standardized preparation courses like IELTS. Feedback shows that students who complete the intermediate curriculum increase their proficiency by up to two CEFR levels within six months. The academy recently integrated digital resources and automated testing systems to ensure that learning is both efficient and fun.',
        options: ['True', 'False', 'Not Given'],
        correctAnswers: ['Not Given'],
        type: 'single',
        section: 'reading',
        category: 'Intermediate',
        order: 66
    },
    {
        text: 'What are the core focuses of the center mentioned in the text? (Select all that apply)',
        passage: 'Oxford Learning Center is a world-renowned educational academy established to help students master English fluency. Utilizing state-of-the-art immersive curricula, the center caters to learners ranging from pre-teen students to adults. The center focuses on interactive speaking sessions, detailed grammar instruction, and standardized preparation courses like IELTS. Feedback shows that students who complete the intermediate curriculum increase their proficiency by up to two CEFR levels within six months. The academy recently integrated digital resources and automated testing systems to ensure that learning is both efficient and fun.',
        options: ['Interactive speaking sessions', 'Detailed grammar instruction', 'Spanish classes', 'Standardized preparation courses'],
        correctAnswers: ['Interactive speaking sessions', 'Detailed grammar instruction', 'Standardized preparation courses'],
        type: 'multiple',
        section: 'reading',
        category: 'Upper-Intermediate',
        order: 67
    },
    {
        text: 'Which word in the text means "well-known and respected globally"?',
        passage: 'Oxford Learning Center is a world-renowned educational academy established to help students master English fluency. Utilizing state-of-the-art immersive curricula, the center caters to learners ranging from pre-teen students to adults. The center focuses on interactive speaking sessions, detailed grammar instruction, and standardized preparation courses like IELTS. Feedback shows that students who complete the intermediate curriculum increase their proficiency by up to two CEFR levels within six months. The academy recently integrated digital resources and automated testing systems to ensure that learning is both efficient and fun.',
        options: ['State-of-the-art', 'Immersive', 'World-renowned', 'Standardized'],
        correctAnswers: ['World-renowned'],
        type: 'single',
        section: 'reading',
        category: 'Upper-Intermediate',
        order: 68
    },
    {
        text: 'The automated testing system was designed by the teachers themselves. (True/False/Not Given)',
        passage: 'Oxford Learning Center is a world-renowned educational academy established to help students master English fluency. Utilizing state-of-the-art immersive curricula, the center caters to learners ranging from pre-teen students to adults. The center focuses on interactive speaking sessions, detailed grammar instruction, and standardized preparation courses like IELTS. Feedback shows that students who complete the intermediate curriculum increase their proficiency by up to two CEFR levels within six months. The academy recently integrated digital resources and automated testing systems to ensure that learning is both efficient and fun.',
        options: ['True', 'False', 'Not Given'],
        correctAnswers: ['Not Given'],
        type: 'single',
        section: 'reading',
        category: 'IELTS',
        order: 69
    },
    {
        text: 'Choose the best synonym for "integrated" as used in the passage:',
        passage: 'Oxford Learning Center is a world-renowned educational academy established to help students master English fluency. Utilizing state-of-the-art immersive curricula, the center caters to learners ranging from pre-teen students to adults. The center focuses on interactive speaking sessions, detailed grammar instruction, and standardized preparation courses like IELTS. Feedback shows that students who complete the intermediate curriculum increase their proficiency by up to two CEFR levels within six months. The academy recently integrated digital resources and automated testing systems to ensure that learning is both efficient and fun.',
        options: ['separated', 'combined / incorporated', 'rejected', 'deleted'],
        correctAnswers: ['combined / incorporated'],
        type: 'single',
        section: 'reading',
        category: 'IELTS',
        order: 70
    },

    // === LISTENING SECTION (10 questions/points total) ===
    {
        text: 'According to the speaker, what is the main purpose of this audio guidance?',
        options: ['To prepare for a job interview', 'To explain the structure of the English Placement Exam', 'To discuss English history', 'To practice pronunciation'],
        correctAnswers: ['To explain the structure of the English Placement Exam'],
        type: 'single',
        section: 'listening',
        category: 'Elementary',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        order: 71
    },
    {
        text: 'Complete the sentence: "The placement test consists of eight different ___."',
        options: ['lessons', 'sections', 'grades', 'questions'],
        correctAnswers: ['sections'],
        type: 'single',
        section: 'listening',
        category: 'Elementary',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        order: 72
    },
    {
        text: 'The total duration of the placement test is how many minutes?',
        options: ['30 minutes', '45 minutes', '60 minutes', '90 minutes'],
        correctAnswers: ['45 minutes'],
        type: 'single',
        section: 'listening',
        category: 'Pre-Intermediate',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        order: 73
    },
    {
        text: 'The speaker states that students should NOT use dictionary help. (True/False/Not Given)',
        options: ['True', 'False', 'Not Given'],
        correctAnswers: ['True'],
        type: 'single',
        section: 'listening',
        category: 'Pre-Intermediate',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        order: 74
    },
    {
        text: 'Fill in the blank: "Every student answer is automatically ___ by the database system."',
        options: ['deleted', 'saved', 'printed', 'mailed'],
        correctAnswers: ['saved'],
        type: 'single',
        section: 'listening',
        category: 'Intermediate',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        order: 75
    },
    {
        text: 'Which sections are graded manually by a professional teacher? (Select all that apply)',
        options: ['Grammar', 'Vocabulary', 'Writing', 'Essay'],
        correctAnswers: ['Writing', 'Essay'],
        type: 'multiple',
        section: 'listening',
        category: 'Intermediate',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        order: 76
    },
    {
        text: 'The speaker says that switching tabs will result in warnings. (True/False/Not Given)',
        options: ['True', 'False', 'Not Given'],
        correctAnswers: ['True'],
        type: 'single',
        section: 'listening',
        category: 'Upper-Intermediate',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        order: 77
    },
    {
        text: 'Complete the phrase: "If you exceed ___ tab switches, the test is automatically submitted."',
        options: ['two', 'three', 'four', 'five'],
        correctAnswers: ['three'],
        type: 'single',
        section: 'listening',
        category: 'Upper-Intermediate',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        order: 78
    },
    {
        text: 'Students can check their instant recommendations immediately on the results screen. (True/False/Not Given)',
        options: ['True', 'False', 'Not Given'],
        correctAnswers: ['True'],
        type: 'single',
        section: 'listening',
        category: 'IELTS',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        order: 79
    },
    {
        text: 'The speaker suggests that candidates should book a free consultation after completing the test. (True/False/Not Given)',
        options: ['True', 'False', 'Not Given'],
        correctAnswers: ['True'],
        type: 'single',
        section: 'listening',
        category: 'IELTS',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        order: 80
    },

    // === WRITING SECTION ===
    {
        text: 'Write about your favorite place to relax.',
        options: [],
        correctAnswers: [],
        type: 'text',
        section: 'writing',
        category: 'Intermediate',
        order: 81
    },

    // === ESSAY SECTION ===
    {
        text: 'Choose one topic and write an essay: \n1. Advantages and disadvantages of social media\n2. Technology and education\n3. Should students use AI tools?',
        options: [],
        correctAnswers: [],
        type: 'text',
        section: 'essay',
        category: 'IELTS',
        order: 82
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
