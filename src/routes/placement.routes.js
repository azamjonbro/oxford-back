const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const studentController = require('../controllers/placement.controller');
const adminController = require('../controllers/admin-placement.controller');

// Student Placement Test Routes (Public)
router.post('/register', studentController.registerTest);
router.post('/save-answer', studentController.saveAnswer);
router.post('/submit', studentController.submitTest);
router.get('/resume/:phone', studentController.resumeTest);

// Admin Lead & Placement Test Management Routes (JWT Protected)
router.get('/admin/leads', auth, adminController.getLeads);
router.put('/admin/leads/:id', auth, adminController.updateLeadStatus);
router.put('/admin/leads/:id/grade', auth, adminController.gradeStudentTest);
router.put('/admin/leads/:id/assign-group', auth, adminController.assignGroup);
router.delete('/admin/leads/:id', auth, adminController.deleteLead);
router.get('/admin/export/csv', auth, adminController.exportLeadsCSV);
router.get('/admin/analytics', auth, adminController.getAnalytics);

module.exports = router;
