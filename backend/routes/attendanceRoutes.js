const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { auth, requireRole } = require('../middleware/auth');

// Student routes
router.post('/mark-start', auth, requireRole('student'), attendanceController.markStart);
router.post('/mark-end', auth, requireRole('student'), attendanceController.markEnd);
router.get('/my-attendance', auth, requireRole('student'), attendanceController.getMyAttendance);
router.get('/summary', auth, requireRole('student'), attendanceController.getAttendanceSummary);

// Faculty routes
router.get('/activity/:id/report', auth, requireRole('faculty'), attendanceController.getActivityReport);

module.exports = router;