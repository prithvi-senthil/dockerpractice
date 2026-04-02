const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveRequestsController');
const { auth, requireRole } = require('../middleware/auth');

router.post('/', auth, requireRole('student'), leaveController.create);
router.get('/', auth, leaveController.getAll);
router.patch('/:id', auth, requireRole('faculty'), leaveController.updateStatus);

module.exports = router;