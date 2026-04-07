const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/leaveRequestsController');
const { auth, requireRole } = require('../middleware/auth');

router.post('/', auth, requireRole('student'), ctrl.create);
router.get('/', auth, ctrl.getAll);
router.patch('/:id', auth, requireRole('faculty', 'admin'), ctrl.updateStatus);
router.get('/summary/:studentId', auth, ctrl.getLeaveSummary);
router.get('/my-summary', auth, requireRole('student'), ctrl.getLeaveSummary);

module.exports = router;